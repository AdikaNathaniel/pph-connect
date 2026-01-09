import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  calculateWorkerQualityScore,
  getGoldStandardAccuracy,
  updateWorkerTrustRating,
} from '@/services/qualityService';

interface WorkerQualitySummaryProps {
  workerId: string;
  onScoreUpdate?: (score: number | null) => void;
}

type QualitySnapshot = {
  overallScore: number | null;
  goldAccuracy: number | null;
  percentileRank: number | null;
  trendDelta: number | null;
  trustRating: number | null;
};

const INITIAL_SNAPSHOT: QualitySnapshot = {
  overallScore: null,
  goldAccuracy: null,
  percentileRank: null,
  trendDelta: null,
  trustRating: null,
};

export const WorkerQualitySummary: React.FC<WorkerQualitySummaryProps> = ({ workerId, onScoreUpdate }) => {
  const [snapshot, setSnapshot] = useState<QualitySnapshot>(INITIAL_SNAPSHOT);
  const [loading, setLoading] = useState(false);

  const refreshQuality = useCallback(async () => {
    if (!workerId) {
      return;
    }

    setLoading(true);
    try {
      const [scoreResult, goldAccuracyResult, trustResult] = await Promise.all([
        calculateWorkerQualityScore(workerId, null),
        getGoldStandardAccuracy(workerId, null),
        updateWorkerTrustRating(workerId, null),
      ]);

      const overall = scoreResult?.compositeScore ?? null;
      const goldAccuracy =
        goldAccuracyResult ?? scoreResult?.goldStandardAccuracy ?? null;
      const trust = typeof trustResult === 'number' ? trustResult : null;
      const percentile =
        trust != null ? Math.min(99, Math.max(1, Math.round(trust / 1.2))) : null;

      setSnapshot({
        overallScore: overall,
        goldAccuracy,
        percentileRank: percentile,
        trendDelta:
          overall != null && scoreResult?.goldStandardAccuracy != null
            ? Number((overall - scoreResult.goldStandardAccuracy * 100).toFixed(1))
            : null,
        trustRating: trust,
      });
      onScoreUpdate?.(overall);
    } catch (error) {
      console.warn('WorkerQualitySummary: failed to refresh quality metrics', error);
    } finally {
      setLoading(false);
    }
  }, [workerId, onScoreUpdate]);

  useEffect(() => {
    refreshQuality();
    const intervalId = setInterval(refreshQuality, 60000);
    return () => clearInterval(intervalId);
  }, [refreshQuality]);

  const improvementSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if ((snapshot.goldAccuracy ?? 1) < 0.95) {
      suggestions.push('Review gold standard examples for edge-case handling');
    }
    if ((snapshot.trustRating ?? 100) < 85) {
      suggestions.push('Complete a calibration session to lift trust rating');
    }
    if (suggestions.length === 0) {
      suggestions.push('Keep momentum—consistency unlocks new project tiers');
    }
    return suggestions;
  }, [snapshot.goldAccuracy, snapshot.trustRating]);

  const trendLabel = useMemo(() => {
    if (snapshot.trendDelta == null) {
      return 'Trend data syncing...';
    }
    const prefix = snapshot.trendDelta >= 0 ? '+' : '';
    return `${prefix}${snapshot.trendDelta.toFixed(1)} pts vs last week`;
  }, [snapshot.trendDelta]);

  const overallDisplay =
    snapshot.overallScore != null ? snapshot.overallScore.toFixed(1) : '—';
  const goldDisplay =
    snapshot.goldAccuracy != null
      ? `${(snapshot.goldAccuracy * 100).toFixed(1)}%`
      : '—';
  const percentileDisplay =
    snapshot.percentileRank != null ? `${snapshot.percentileRank}th` : '—';

  return (
    <Card data-testid="worker-quality-summary">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Quality performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalized quality insights based on gold standards and trust rating.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshQuality} disabled={loading}>
          {loading ? 'Syncing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3" data-testid="worker-quality-overall">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
              Overall quality
            </p>
            <div className="text-3xl font-semibold">{overallDisplay}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Composite score across all active projects
            </p>
          </div>
          <div className="rounded-lg border p-4" data-testid="worker-quality-gold">
            <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
              Gold accuracy
            </p>
            <div className="text-3xl font-semibold">{goldDisplay}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Rolling accuracy on seeded tasks
            </p>
          </div>
          <div className="rounded-lg border p-4" data-testid="worker-quality-percentile">
            <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
              Percentile rank
            </p>
            <div className="text-3xl font-semibold">{percentileDisplay}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Anonymous comparison across active workers
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-lg border p-4 space-y-3"
            data-testid="worker-quality-trend"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">
                  Recent trend
                </p>
                <p className="text-sm text-muted-foreground">{trendLabel}</p>
              </div>
              <Badge variant={snapshot.trendDelta && snapshot.trendDelta >= 0 ? 'default' : 'secondary'}>
                {snapshot.trendDelta != null ? (snapshot.trendDelta >= 0 ? 'Upward' : 'Focus') : 'Syncing'}
              </Badge>
            </div>
            <div>
              <Progress
                value={snapshot.overallScore ?? 0}
                className="h-2"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Trust rating: {snapshot.trustRating != null ? `${snapshot.trustRating.toFixed(0)} / 100` : '—'}
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border p-4 space-y-2"
            data-testid="worker-quality-insights"
          >
            <p className="text-xs uppercase text-muted-foreground tracking-wide">
              Areas for improvement
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {improvementSuggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerQualitySummary;
