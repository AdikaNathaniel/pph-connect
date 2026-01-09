import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import WorkerLayout from '@/components/layout/WorkerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchExitSurvey, submitExitSurvey } from '@/services/exitSurveyService';

const REASONS = [
  { value: 'new_opportunity', label: 'Found a new opportunity' },
  { value: 'compensation', label: 'Compensation concerns' },
  { value: 'schedule', label: 'Scheduling / availability' },
  { value: 'performance', label: 'Performance action' },
  { value: 'policy', label: 'Policy related' },
  { value: 'contract_end', label: 'Contract ended' },
  { value: 'other', label: 'Other reason' },
];

const WorkerExitSurveyPage: React.FC = () => {
  const { user } = useAuth();
  const workerId = user?.id ?? null;
  const [reason, setReason] = useState<string>('other');
  const [overallRating, setOverallRating] = useState<number>(4);
  const [improvements, setImprovements] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  const { data: existingSurvey, isLoading } = useQuery({
    queryKey: ['exit-survey', workerId],
    queryFn: () => fetchExitSurvey(workerId),
    enabled: Boolean(workerId),
  });

  useMemo(() => {
    if (!existingSurvey) return;
    if (existingSurvey.reason) setReason(existingSurvey.reason);
    if (typeof existingSurvey.overallRating === 'number') setOverallRating(existingSurvey.overallRating);
    if (existingSurvey.improvementSuggestions) setImprovements(existingSurvey.improvementSuggestions);
    if (typeof existingSurvey.wouldRecommend === 'boolean') setWouldRecommend(existingSurvey.wouldRecommend);
    if (existingSurvey.additionalFeedback) setAdditionalFeedback(existingSurvey.additionalFeedback);
  }, [existingSurvey]);

  const surveyMutation = useMutation({
    mutationFn: () =>
      submitExitSurvey({
        workerId: workerId!,
        reason,
        overallRating,
        improvementSuggestions: improvements,
        wouldRecommend,
        additionalFeedback,
      }),
    onSuccess: () => toast.success('Thanks! Your feedback has been submitted.'),
    onError: () => toast.error('Unable to submit survey right now.'),
  });

  const disabled = !workerId || surveyMutation.isPending;

  return (
    <WorkerLayout>
      <div data-testid="worker-exit-survey" className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Exit Survey</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for your contributions. Please share feedback so we can keep improving the worker experience.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your responses…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tell us more</CardTitle>
              <CardDescription>Only admins see this feedback. It will not impact payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Reason for leaving</Label>
                <RadioGroup
                  data-testid="reason-select"
                  value={reason}
                  onValueChange={setReason}
                  className="grid gap-2"
                >
                  {REASONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 rounded-md border border-border/70 p-2">
                      <RadioGroupItem value={option.value} id={`reason-${option.value}`} />
                      <Label htmlFor={`reason-${option.value}`} className="cursor-pointer text-sm font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overall-rating">Overall experience (1-5)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="overall-rating"
                    data-testid="overall-rating-slider"
                    min={1}
                    max={5}
                    step={1}
                    value={[overallRating]}
                    onValueChange={([value]) => setOverallRating(value)}
                    className="max-w-sm"
                  />
                  <Badge variant="secondary">{overallRating}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="improvements">What we could improve</Label>
                <Textarea
                  id="improvements"
                  data-testid="improvement-textarea"
                  placeholder="Share feedback on processes, tools, or communication…"
                  rows={4}
                  value={improvements}
                  onChange={(event) => setImprovements(event.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/80 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="would-recommend">Would you recommend to others?</Label>
                  <p className="text-sm text-muted-foreground">We appreciate honest feedback.</p>
                </div>
                <Switch
                  id="would-recommend"
                  data-testid="would-recommend-toggle"
                  checked={wouldRecommend}
                  onCheckedChange={setWouldRecommend}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-feedback">Optional feedback</Label>
                <Textarea
                  id="additional-feedback"
                  data-testid="additional-feedback"
                  rows={4}
                  value={additionalFeedback}
                  onChange={(event) => setAdditionalFeedback(event.target.value)}
                />
              </div>

              <Button
                data-testid="exit-survey-submit"
                disabled={disabled}
                onClick={() => surveyMutation.mutate()}
              >
                {surveyMutation.isPending ? 'Submitting…' : 'Submit survey'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </WorkerLayout>
  );
};

export default WorkerExitSurveyPage;
