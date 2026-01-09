import { FC, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type TrainingModule = Database['public']['Tables']['training_modules']['Row'];

type TrainingModalProps = {
  training: TrainingModule;
  projectId: string;
  workerId: string;
  isRequired: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => Promise<void> | void;
  isCompleted: boolean;
};

const getEmbeddedYoutubeUrl = (videoUrl: string) => {
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes('youtube.com') || url.hostname === 'youtu.be') {
      if (url.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${url.pathname.replace('/', '')}`;
      }

      if (url.searchParams.get('v')) {
        return `https://www.youtube.com/embed/${url.searchParams.get('v')}`;
      }

      // Handle already embed links
      if (url.pathname.includes('/embed/')) {
        return videoUrl;
      }
    }
  } catch (error) {
    console.warn('Invalid video URL provided for training module', error);
  }

  return videoUrl;
};

const TrainingModal: FC<TrainingModalProps> = ({
  training,
  projectId,
  workerId,
  isRequired,
  open,
  onOpenChange,
  onComplete,
  isCompleted,
}) => {
  const [acknowledged, setAcknowledged] = useState(isCompleted);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<Date | null>(null);

  const embedUrl = useMemo(() => (training.video_url ? getEmbeddedYoutubeUrl(training.video_url) : null), [training.video_url]);

  useEffect(() => {
    if (open) {
      if (isCompleted) {
        setAcknowledged(true);
        startTimeRef.current = null;
      } else {
        setAcknowledged(false);
        startTimeRef.current = new Date();
      }
    } else {
      startTimeRef.current = null;
    }
  }, [open, isCompleted]);

  const handleComplete = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      const completedAt = new Date();
      const startedAt = startTimeRef.current ?? completedAt;
      const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));

      const payload = {
        worker_id: workerId,
        training_module_id: training.id,
        project_id: projectId,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
      };

      const { error } = await supabase
        .from('worker_training_completions')
        .insert(payload);

      if (error) {
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('worker_training_completions')
            .update({
              started_at: payload.started_at,
              completed_at: payload.completed_at,
              duration_seconds: payload.duration_seconds,
            })
            .eq('worker_id', workerId)
            .eq('project_id', projectId)
            .eq('training_module_id', training.id);

          if (updateError) {
            console.error('Failed to update training completion', updateError);
            toast.error('Unable to update training completion. Please try again.');
            return;
          }
        } else {
          console.error('Failed to record training completion', error);
          toast.error('Unable to mark training as complete. Please try again.');
          return;
        }
      }

      toast.success('Training completion recorded.');
      await onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Unexpected error recording training completion', error);
      toast.error('Unexpected error recording completion. Please try again.');
    } finally {
      setSubmitting(false);
      setAcknowledged(isCompleted);
      startTimeRef.current = null;
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      startTimeRef.current = null;
    }
    onOpenChange(value);
  };

  const shouldDisableAction = isRequired && !acknowledged && !isCompleted;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-left text-2xl font-semibold">{training.title}</DialogTitle>
          {training.description && (
            <DialogDescription className="text-left text-muted-foreground">
              {training.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {embedUrl && (
            <div className="w-full overflow-hidden rounded-lg border bg-muted">
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Training video"
                />
              </div>
            </div>
          )}

          {training.content && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              <ReactMarkdown>{training.content}</ReactMarkdown>
            </div>
          )}

          {isRequired && !isCompleted && (
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="acknowledged" checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(Boolean(checked))} />
              <Label htmlFor="acknowledged" className="text-sm font-medium">
                I have reviewed this training material
              </Label>
            </div>
          )}

          {isCompleted && (
            <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
              Training completed. You can review the material again anytime.
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          {isRequired && !isCompleted && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button onClick={handleComplete} disabled={shouldDisableAction || submitting}>
            {isCompleted ? 'Completed' : submitting ? 'Saving...' : 'Mark as Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingModal;
