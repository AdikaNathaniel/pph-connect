import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCcw, Trophy, Award, ListOrdered, Timer } from 'lucide-react';
import {
  getTopEarnersLeaderboard,
  getTopQualityLeaderboard,
  getMostProductiveLeaderboard,
  getFastestCompletionLeaderboard,
  type LeaderboardEntry
} from '@/services/leaderboardService';
import { toast } from 'sonner';

const formatCurrencyValue = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toFixed(0)}`;
  }
};

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

export const WorkerLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [earners, setEarners] = useState<LeaderboardEntry[]>([]);
  const [quality, setQuality] = useState<LeaderboardEntry[]>([]);
  const [throughput, setThroughput] = useState<LeaderboardEntry[]>([]);
  const [speed, setSpeed] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareIdentity, setShareIdentity] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('pph-leaderboard-opt-in');
    return stored ? stored === 'true' : true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pph-leaderboard-opt-in', shareIdentity ? 'true' : 'false');
  }, [shareIdentity]);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [earnersResult, qualityResult, throughputResult, speedResult] = await Promise.all([
        getTopEarnersLeaderboard(),
        getTopQualityLeaderboard(),
        getMostProductiveLeaderboard(),
        getFastestCompletionLeaderboard(),
      ]);
      setEarners(earnersResult);
      setQuality(qualityResult);
      setThroughput(throughputResult);
      setSpeed(speedResult);
    } catch (error) {
      console.error('WorkerLeaderboardPage: failed to load leaderboards', error);
      toast.error('Unable to load leaderboards. Please try again.');
      setEarners([]);
      setQuality([]);
      setThroughput([]);
      setSpeed([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards().catch((error) => console.warn('WorkerLeaderboardPage: unexpected error', error));
  }, []);

  const formatSecondsValue = (value: number) => {
    if (!Number.isFinite(value)) return '—';
    const rounded = Math.round(value);
    const minutes = Math.floor(rounded / 60);
    const seconds = rounded % 60;
    if (minutes <= 0) {
      return `${seconds}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const renderEntryValue = (entry: LeaderboardEntry) => {
    switch (entry.unit) {
      case 'percentage':
        return formatPercentage(entry.value);
      case 'tasks':
        return `${Math.round(entry.value).toLocaleString()} tasks`;
      case 'seconds':
        return formatSecondsValue(entry.value);
      default:
        return formatCurrencyValue(entry.value);
    }
  };
  const renderLeaderboard = (
    entries: LeaderboardEntry[],
    testId: string,
    valueLabel: string
  ) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading leaderboard…</p>;
    }
    if (!entries.length) {
      return <p className="text-sm text-muted-foreground">No data available for this leaderboard.</p>;
    }
    return (
      <div className="space-y-3" data-testid={testId}>
        {entries.map((entry, index) => {
          const isCurrentWorker = user?.id === entry.workerId;
          const showIdentity = isCurrentWorker && shareIdentity;
          const displayName = showIdentity ? entry.fullName : `Participant #${index + 1}`;
          const detailLine = showIdentity
            ? `${entry.hrId ? `ID ${entry.hrId}` : 'You'} • ${entry.locale ?? 'Global'}`
            : 'Anonymized participant';
          return (
            <div
              key={entry.workerId ?? `${entry.fullName}-${index}`}
              data-testid="leaderboard-entry"
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition ${
                isCurrentWorker ? 'border-primary bg-primary/5' : 'border-border/60 bg-background'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                {index + 1}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{displayName}</p>
                  {isCurrentWorker ? (
                    <Badge variant={showIdentity ? 'secondary' : 'outline'}>
                      {showIdentity ? 'You' : 'Hidden'}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{detailLine}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{renderEntryValue(entry)}</p>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">{valueLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen" data-testid="worker-leaderboard-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Community pulse</p>
            <h1 className="text-3xl font-bold">Leaderboards</h1>
            <p className="text-sm text-muted-foreground">
              Track the top earners this month and workers with the highest quality scores.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLeaderboards} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card data-testid="leaderboard-privacy-note">
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Leaderboard privacy</p>
              <p className="text-xs text-muted-foreground">
                Rankings are anonymized by default. Toggle participation to display your name in the lists.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Share my name</span>
              <Switch checked={shareIdentity} onCheckedChange={(checked) => setShareIdentity(Boolean(checked))} />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="worker-leaderboard-earners">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Earners (This Month)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on approved work stats from the current month.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {renderLeaderboard(earners, 'leaderboard-earners-list', 'Earnings this month')}
          </CardContent>
        </Card>

        <Card data-testid="worker-leaderboard-quality">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Highest Quality Scores
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Uses the latest quality metrics recorded for each worker.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {renderLeaderboard(quality, 'leaderboard-quality-list', 'Quality score')}
          </CardContent>
        </Card>

        <Card data-testid="worker-leaderboard-throughput">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-muted-foreground" />
                Most Tasks Completed
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Workers with the highest number of completed tasks this month.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {renderLeaderboard(throughput, 'leaderboard-throughput-list', 'Tasks completed')}
          </CardContent>
        </Card>

        <Card data-testid="worker-leaderboard-speed">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-muted-foreground" />
                Fastest Average Completion Time
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Lower values indicate faster completion per task (based on logged hours).
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {renderLeaderboard(speed, 'leaderboard-speed-list', 'Avg time per task')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerLeaderboardPage;
