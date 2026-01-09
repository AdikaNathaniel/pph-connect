import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import WorkerLayout from '@/components/layout/WorkerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWorkerAnalyticsSummary, type WorkerAnalyticsSummary } from '@/services/workerAnalyticsService';
import {
  fetchWorkerGoalsWithProgress,
  upsertWorkerGoal,
  type UpsertWorkerGoalInput,
  type WorkerGoalWithProgress,
} from '@/services/workerGoalsService';

const defaultNumber = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});

type GoalFormState = UpsertWorkerGoalInput;

const GOAL_PRESETS: Array<GoalFormState & { label: string }> = [
  {
    label: 'Complete 100 tasks this week',
    goal_type: 'tasks',
    period: 'weekly',
    target_value: 100,
    description: 'Complete 100 tasks this week',
  },
  {
    label: 'Achieve 95% accuracy',
    goal_type: 'quality',
    period: 'weekly',
    target_value: 95,
    description: 'Maintain a 95% quality score',
  },
  {
    label: 'Earn $500 this month',
    goal_type: 'earnings',
    period: 'monthly',
    target_value: 500,
    description: 'Earn at least $500 this month',
  },
];

interface ChartCardProps<T extends Record<string, unknown>> {
  title: string;
  helper?: string;
  dataTestId: string;
  data: T[];
  dataKey: keyof T;
  valueFormatter?: (value: number) => string;
}

const AnalyticsChartCard = <T extends Record<string, unknown>>({
  title,
  helper,
  dataTestId,
  data,
  dataKey,
  valueFormatter,
}: ChartCardProps<T>) => {
  const gradientId = `${dataTestId}-gradient`;
  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {helper ? <CardDescription>{helper}</CardDescription> : null}
      </CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
            <p>No data available yet.</p>
            <p className="text-xs">Complete tasks to unlock this insight.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '0.5rem',
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--card)',
                }}
                formatter={(value: number) =>
                  valueFormatter ? valueFormatter(Number(value)) : defaultNumber.format(Number(value))
                }
              />
              <Area
                type="monotone"
                dataKey={dataKey as string}
                stroke="var(--primary)"
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

interface SummarySnapshot {
  totalTasks: number;
  totalEarnings: number;
  averageQuality: number | null;
  averageSpeedSeconds: number | null;
  totalDaysTracked: number;
}

const deriveSummary = (analytics?: WorkerAnalyticsSummary | null): SummarySnapshot => {
  if (!analytics) {
    return {
      totalTasks: 0,
      totalEarnings: 0,
      averageQuality: null,
      averageSpeedSeconds: null,
      totalDaysTracked: 0,
    };
  }

  if (analytics.summary) {
    return {
      totalTasks: analytics.summary.tasksPerDayTotal ?? 0,
      totalEarnings: analytics.summary.earningsTotal ?? 0,
      averageQuality: analytics.summary.averageQuality ?? null,
      averageSpeedSeconds: analytics.summary.averageSecondsPerTask ?? null,
      totalDaysTracked: analytics.summary.daysTracked ?? 0,
    };
  }

  const totalTasks = (analytics.tasksPerDay ?? []).reduce((sum, entry) => sum + entry.tasks, 0);
  const totalEarnings = (analytics.earningsPerDay ?? []).reduce((sum, entry) => sum + entry.earnings, 0);
  const latestQuality = analytics.qualityTrend.at(-1)?.score ?? null;
  const latestSpeed = analytics.speedTrend.at(-1)?.secondsPerTask ?? null;
  const daysTracked = new Set((analytics.tasksPerDay ?? []).map((entry) => entry.date)).size;

  return {
    totalTasks,
    totalEarnings,
    averageQuality: latestQuality,
    averageSpeedSeconds: latestSpeed,
    totalDaysTracked: daysTracked,
  };
};

const SummaryMetric: React.FC<{ label: string; value: string; helper?: string }> = ({ label, value, helper }) => (
  <div className="rounded-lg border bg-muted/20 p-4">
    <p className="text-xl font-semibold">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
    {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

const GOAL_UNIT_LABEL: Record<WorkerGoalType, string> = {
  tasks: 'tasks',
  quality: '% quality',
  earnings: 'USD',
};

const describeGoal = (goal: { goal_type: WorkerGoalType; target_value: number; period: WorkerGoalPeriod; description?: string | null }) => {
  if (goal.description) {
    return goal.description;
  }
  const unit = GOAL_UNIT_LABEL[goal.goal_type];
  const timeframe = goal.period === 'weekly' ? 'this week' : 'this month';
  return `Reach ${goal.target_value} ${unit} ${timeframe}`;
};

const formatGoalProgressValue = (goal: WorkerGoalWithProgress) => {
  if (goal.goal_type === 'quality') {
    return `${goal.progressValue.toFixed(1)}%`;
  }
  if (goal.goal_type === 'earnings') {
    return currencyFormatter.format(goal.progressValue);
  }
  return `${goal.progressValue.toFixed(0)} tasks`;
};

const WorkerAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const workerId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [goalForm, setGoalForm] = useState<GoalFormState>(GOAL_PRESETS[0]);
  const [isGoalDialogOpen, setGoalDialogOpen] = useState(false);
  const [celebratedGoalIds, setCelebratedGoalIds] = useState<string[]>([]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['worker-analytics', workerId],
    queryFn: () => fetchWorkerAnalyticsSummary(workerId),
    enabled: Boolean(workerId),
  });

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
  } = useQuery({
    queryKey: ['worker-goals', workerId],
    queryFn: () => fetchWorkerGoalsWithProgress(workerId),
    enabled: Boolean(workerId),
  });

  const { mutateAsync: saveGoal, isPending: isSavingGoal } = useMutation({
    mutationFn: (input: GoalFormState) => upsertWorkerGoal(workerId, input),
    onSuccess: () => {
      toast.success('Personal goal saved');
      queryClient.invalidateQueries({ queryKey: ['worker-goals', workerId] });
      setGoalDialogOpen(false);
    },
    onError: () => {
      toast.error('Could not save your goal. Please try again.');
    },
  });

  const summary = useMemo(() => deriveSummary(data ?? null), [data]);

  const hasTimeSeries = useMemo(() => {
    if (!data) return false;
    return [data.tasksPerDay, data.qualityTrend, data.earningsPerDay, data.speedTrend].some(
      (series) => (series?.length ?? 0) > 0
    );
  }, [data]);

  const errorMessage = error instanceof Error ? error.message : 'Unable to load analytics right now.';
  const insights = (data?.insights ?? []).length > 0 ? data?.insights ?? [] : ['Keep submitting work to unlock insights.'];

  useEffect(() => {
    if (!goals.length) {
      return;
    }
    const newlyCompleted = goals.filter(
      (goal) => goal.shouldCelebrate && !celebratedGoalIds.includes(goal.id)
    );
    if (!newlyCompleted.length) {
      return;
    }
    newlyCompleted.forEach((goal) => {
      toast.success(`Goal completed: ${describeGoal(goal)}`);
    });
    setCelebratedGoalIds((prev) => [...prev, ...newlyCompleted.map((goal) => goal.id)]);
  }, [goals, celebratedGoalIds]);

  const handleGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveGoal(goalForm);
  };

  const applyPreset = (preset: GoalFormState & { label: string }) => {
    setGoalForm({
      goal_type: preset.goal_type,
      period: preset.period,
      target_value: preset.target_value,
      description: preset.description,
    });
    setGoalDialogOpen(true);
  };

  return (
    <WorkerLayout>
      <div data-testid="worker-analytics-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Analytics</p>
            <h1 className="text-2xl font-semibold tracking-tight">Your Performance</h1>
            <p className="text-sm text-muted-foreground">
              Visualize productivity, earnings, quality, and pacing trends compared to the workspace average.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading analytics…</CardContent>
          </Card>
        ) : isError ? (
          <Card data-testid="worker-analytics-error">
            <CardHeader>
              <CardTitle>We could not load analytics</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" onClick={() => refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card data-testid="worker-analytics-summary">
              <CardHeader>
                <CardTitle>Last 30 days</CardTitle>
                <CardDescription>Your recent momentum snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SummaryMetric label="Tasks completed" value={defaultNumber.format(summary.totalTasks)} />
                  <SummaryMetric label="Earnings" value={currencyFormatter.format(summary.totalEarnings)} />
                  <SummaryMetric
                    label="Quality"
                    value={summary.averageQuality != null ? `${summary.averageQuality.toFixed(1)}%` : '—'}
                    helper="Average rolling score"
                  />
                  <SummaryMetric
                    label="Avg speed"
                    value={summary.averageSpeedSeconds != null ? `${Math.round(summary.averageSpeedSeconds)}s` : '—'}
                    helper="Seconds per task"
                  />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Tracking {summary.totalDaysTracked || '0'} active days in the selected window.
                </p>
              </CardContent>
            </Card>

            {hasTimeSeries ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AnalyticsChartCard
                  dataTestId="analytics-chart-tasks"
                  title="Tasks completed"
                  helper="Rolling 30-day tally"
                  data={data?.tasksPerDay ?? []}
                  dataKey="tasks"
                  valueFormatter={(value) => `${defaultNumber.format(value)} tasks`}
                />
                <AnalyticsChartCard
                  dataTestId="analytics-chart-quality"
                  title="Quality trend"
                  helper="Per-metric quality score"
                  data={data?.qualityTrend ?? []}
                  dataKey="score"
                  valueFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <AnalyticsChartCard
                  dataTestId="analytics-chart-earnings"
                  title="Earnings trend"
                  helper="Daily earnings"
                  data={data?.earningsPerDay ?? []}
                  dataKey="earnings"
                  valueFormatter={(value) => currencyFormatter.format(value)}
                />
                <AnalyticsChartCard
                  dataTestId="analytics-chart-speed"
                  title="Time per task"
                  helper="Seconds per task (lower is faster)"
                  data={data?.speedTrend ?? []}
                  dataKey="secondsPerTask"
                  valueFormatter={(value) => `${Math.round(value)}s`}
                />
              </div>
            ) : (
              <Card data-testid="worker-analytics-empty">
                <CardHeader>
                  <CardTitle>Analytics will appear here</CardTitle>
                  <CardDescription>Once you complete tasks, charts and insights will be available.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete at least one task this week to unlock personalized analytics and peer benchmarking.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card data-testid="analytics-benchmark-card">
                <CardHeader>
                  <CardTitle>Benchmarking</CardTitle>
                  <CardDescription>Peer comparison metrics (workspace average)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Quality percentile</span>
                    <span className="font-medium">
                      {data?.benchmarks.qualityPercentile != null
                        ? `${data.benchmarks.qualityPercentile}th`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Speed vs peers</span>
                    <span className="font-medium">
                      {data?.benchmarks.speedVsPeers != null
                        ? `${Math.round(data.benchmarks.speedVsPeers * 100)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tasks vs peers</span>
                    <span className="font-medium">
                      {data?.benchmarks.tasksVsPeers != null
                        ? `${Math.round(data.benchmarks.tasksVsPeers * 100)}%`
                        : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="analytics-insights">
                <CardHeader>
                  <CardTitle>Insights</CardTitle>
                  <CardDescription>Personalized guidance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insights.map((insight) => (
                    <div key={insight} className="rounded-md border bg-muted/50 p-3 text-sm">
                      {insight}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" asChild>
                    <a href="/worker/training">View training resources</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="worker-goals-card">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Personal goals</CardTitle>
                  <CardDescription>Set a weekly or monthly target and watch your progress.</CardDescription>
                </div>
                <Dialog open={isGoalDialogOpen} onOpenChange={setGoalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-goal-button">
                      Set goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a personal goal</DialogTitle>
                      <DialogDescription>Track tasks, earnings, or quality milestones.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleGoalSubmit}>
                      <div className="grid gap-2">
                        <Label htmlFor="goal-type">Goal type</Label>
                        <Select
                          value={goalForm.goal_type}
                          onValueChange={(value) =>
                            setGoalForm((prev) => ({ ...prev, goal_type: value as GoalFormState['goal_type'] }))
                          }
                        >
                          <SelectTrigger id="goal-type">
                            <SelectValue placeholder="Choose goal type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tasks">Tasks</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="earnings">Earnings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="goal-period">Period</Label>
                        <Select
                          value={goalForm.period}
                          onValueChange={(value) =>
                            setGoalForm((prev) => ({ ...prev, period: value as GoalFormState['period'] }))
                          }
                        >
                          <SelectTrigger id="goal-period">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="goal-target">Target</Label>
                        <Input
                          id="goal-target"
                          type="number"
                          min={1}
                          value={goalForm.target_value}
                          onChange={(event) =>
                            setGoalForm((prev) => ({ ...prev, target_value: Number(event.target.value) }))
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="goal-description">Description</Label>
                        <Textarea
                          id="goal-description"
                          value={goalForm.description ?? ''}
                          onChange={(event) =>
                            setGoalForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                          placeholder="Explain what success looks like"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quick presets</Label>
                        <div className="flex flex-wrap gap-2">
                          {GOAL_PRESETS.map((preset) => (
                            <Button key={preset.label} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isSavingGoal}>
                          {isSavingGoal ? 'Saving…' : 'Save goal'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isGoalsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading goals…</p>
                ) : goals.length === 0 ? (
                  <div className="space-y-3 text-sm text-muted-foreground" data-testid="worker-goals-empty">
                    <p>You have not set any personal goals yet. Use a preset to get started quickly.</p>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_PRESETS.map((preset) => (
                        <Button key={preset.label} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goals.map((goal) => (
                      <div key={goal.id} className="rounded-lg border p-4" data-testid="worker-goal-item">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{describeGoal(goal)}</p>
                            <p className="text-xs text-muted-foreground">
                              Target {goal.target_value} {GOAL_UNIT_LABEL[goal.goal_type]} ·{' '}
                              {goal.period === 'weekly' ? 'This week' : 'This month'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              goal.status === 'completed'
                                ? 'default'
                                : goal.status === 'expired'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {goal.statusLabel}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>
                              {formatGoalProgressValue(goal)} · {goal.progressPercent}%
                            </span>
                          </div>
                          <Progress value={goal.progressPercent} />
                        </div>
                        {goal.shouldCelebrate && (
                          <p className="mt-2 text-sm font-medium text-green-600">
                            🎉 Awesome! You've completed this goal.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </WorkerLayout>
  );
};

export default WorkerAnalyticsPage;
