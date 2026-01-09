import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface QualityFeedbackCardProps {
  qualityScore: number | null;
  goldAccuracy: number | null;
  goldMatch: boolean | null;
  trainingHref: string;
  projectName?: string | null;
  onDismiss?: () => void;
}

const formatScore = (value: number | null, fallback = '—') => {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return value.toFixed(1);
};

const formatPercent = (value: number | null) => {
  if (value == null || Number.isNaN(value)) {
    return 'Syncing…';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const QualityFeedbackCard: React.FC<QualityFeedbackCardProps> = ({
  qualityScore,
  goldAccuracy,
  goldMatch,
  trainingHref,
  onDismiss,
  projectName,
}) => {
  const trustLabel = qualityScore != null ? `${qualityScore.toFixed(0)} / 100` : 'Syncing…';
  const showGoldWarning = goldMatch === false;

  return (
    <Card data-testid="workbench-quality-feedback" className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold">Quality update</CardTitle>
          <CardDescription>
            {projectName ? `Latest snapshot for ${projectName}` : 'Latest snapshot from seeded tasks'}
          </CardDescription>
        </div>
        {onDismiss ? (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase text-muted-foreground">Trust rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{trustLabel}</span>
              {qualityScore != null ? (
                <Badge variant={qualityScore >= 85 ? 'default' : 'secondary'}>Live</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <Progress value={qualityScore ?? 0} className="mt-2 h-2" />
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase text-muted-foreground">Gold accuracy</p>
            <div className="text-2xl font-semibold">{formatPercent(goldAccuracy)}</div>
            <p className="text-xs text-muted-foreground mt-1">Rolling accuracy on control tasks</p>
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <div className="flex items-center gap-2 text-sm">
              {showGoldWarning ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Review recommended</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>On track</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {showGoldWarning
                ? 'Latest control task missed expectations. Revisit training to stay in good standing.'
                : 'Keep maintaining consistency to unlock higher tier work.'}
            </p>
          </div>
        </div>

        {showGoldWarning ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm">
            <span>Brush up on calibration modules to avoid access restrictions.</span>
            <Button asChild size="sm" variant="secondary">
              <Link to={trainingHref}>Open training hub</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default QualityFeedbackCard;
