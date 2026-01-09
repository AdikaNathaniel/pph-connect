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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface ReplaceAccountModalProps {
  account: {
    id: string;
    worker_id: string;
    platform_type: string;
    worker_account_email: string;
    worker_account_id: string;
    status: string;
  } | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const initialState = {
  newEmail: '',
  newAccountId: '',
  reason: ''
};

export const ReplaceAccountModal: React.FC<ReplaceAccountModalProps> = ({
  account,
  open,
  onClose,
  onSuccess
}) => {
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState<{ email?: string; accountId?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormState(initialState);
      setErrors({});
      setIsSubmitting(false);
    } else if (account) {
      setFormState((prev) => ({
        ...prev,
        newEmail: '',
        newAccountId: '',
        reason: ''
      }));
    }
  }, [open, account]);

  const disabled = useMemo(() => isSubmitting, [isSubmitting]);

  const handleChange =
    (key: 'newEmail' | 'newAccountId' | 'reason') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const validate = () => {
    const nextErrors: { email?: string; accountId?: string } = {};
    if (!formState.newEmail.trim()) {
      nextErrors.email = 'New account email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.newEmail.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!formState.newAccountId.trim()) {
      nextErrors.accountId = 'New account identifier is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) {
      showErrorToast('No account selected for replacement.');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      const { error: updateError } = await supabase
        .from('worker_accounts')
        .update({
          is_current: false,
          status: 'replaced',
          deactivated_at: now,
          deactivation_reason: formState.reason.trim() || null,
          updated_at: now
        })
        .eq('id', account.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: insertError } = await supabase.from('worker_accounts').insert([
        {
          worker_id: account.worker_id,
          worker_account_email: formState.newEmail.trim(),
          worker_account_id: formState.newAccountId.trim(),
          platform_type: account.platform_type,
          status: 'active',
          is_current: true,
          activated_at: now,
          created_at: now,
          updated_at: now
        }
      ]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      showSuccessToast('Worker account replaced', {
        description: 'The old account was archived and the new credential is now active.'
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      showErrorToast('Unable to replace account', {
        description: error instanceof Error ? error.message : 'Unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace platform account</DialogTitle>
          <DialogDescription>
            Archive the current credential and register a new active account for this worker. Historical
            records remain available in the account timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="replace-account-email">New Account Email</Label>
            <Input
              id="replace-account-email"
              data-testid="replace-account-email"
              type="email"
              placeholder="worker@example.com"
              value={formState.newEmail}
              onChange={handleChange('newEmail')}
              disabled={disabled}
              required
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="replace-account-id">New Account ID</Label>
            <Input
              id="replace-account-id"
              data-testid="replace-account-id"
              placeholder="Enter unique account identifier"
              value={formState.newAccountId}
              onChange={handleChange('newAccountId')}
              disabled={disabled}
              required
            />
            {errors.accountId ? <p className="text-sm text-destructive">{errors.accountId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="replace-account-reason">Reason for replacement (optional)</Label>
            <Textarea
              id="replace-account-reason"
              data-testid="replace-account-reason"
              placeholder="Provide additional context for the credential change"
              value={formState.reason}
              onChange={handleChange('reason')}
              disabled={disabled}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button type="submit" data-testid="replace-account-submit" disabled={disabled}>
              {isSubmitting ? 'Replacing…' : 'Replace account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReplaceAccountModal;
