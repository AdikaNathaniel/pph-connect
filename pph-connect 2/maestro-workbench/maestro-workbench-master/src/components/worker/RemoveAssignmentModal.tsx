import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface RemoveAssignmentModalProps {
  assignment: {
    id: string;
    project_id: string;
    project?: {
      project_code: string;
      project_name: string;
    } | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RemoveAssignmentModal: React.FC<RemoveAssignmentModalProps> = ({
  assignment,
  open,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (isActive) {
          setUserId(data.user?.id ?? null);
        }
      })
      .catch(() => {
        if (isActive) {
          setUserId(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setReason('');
      setIsSubmitting(false);
    }
  }, [open]);

  const disabled = useMemo(() => isSubmitting, [isSubmitting]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignment) {
      showErrorToast('No assignment selected for removal.');
      return;
    }

    if (!userId) {
      showErrorToast('Unable to identify current user. Try again later.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('worker_assignments')
        .update({
          removed_at: now,
          removed_by: userId,
          removal_reason: reason.trim() || null
        })
        .eq('id', assignment.id);

      if (error) {
        throw new Error(error.message);
      }

      showSuccessToast('Assignment updated', {
        description: 'The worker has been removed from the project.'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      showErrorToast('Unable to remove assignment', {
        description: error instanceof Error ? error.message : 'Unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectLabel = assignment?.project
    ? `${assignment.project.project_name} (${assignment.project.project_code})`
    : 'this project';

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove worker from project</DialogTitle>
          <DialogDescription>
            Confirm that you want to remove this worker from {projectLabel}. The assignment will be archived and no
            longer counted as active.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="remove-assignment-reason">Reason for removal (optional)</Label>
            <Textarea
              id="remove-assignment-reason"
              data-testid="remove-assignment-reason"
              placeholder="Provide optional context for the removal"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={disabled}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button type="submit" data-testid="remove-assignment-submit" disabled={disabled}>
              {isSubmitting ? 'Removing…' : 'Remove from project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveAssignmentModal;
