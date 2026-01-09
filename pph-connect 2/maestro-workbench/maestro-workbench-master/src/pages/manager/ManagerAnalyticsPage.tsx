import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchManagerAnalyticsSummary } from '@/services/managerAnalyticsService';

const formatNumber = new Intl.NumberFormat('en-US');

const ManagerAnalyticsPage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['manager-analytics-dashboard'],
    queryFn: fetchManagerAnalyticsSummary,
  });

  const summary = data?.summaryCards;
  const charts = data?.chartData;
  const alerts = data?.alerts;

  return (
    <div data-testid="manager-analytics-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics Overview</h1>
          <p className="text-sm text-muted-foreground">
            Monitor production health across projects, workers, quality, and throughput.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading analytics…
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load analytics</CardTitle>
            <CardDescription>{error instanceof Error ? error.message : 'Unknown error'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      ) : summary && charts && alerts ? (
        <>
          <Card data-testid="manager-analytics-alerts">
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Action items requiring manager attention</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {[
                { label: 'Projects behind schedule', items: alerts.projectsBehindSchedule },
                { label: 'Quality decline', items: alerts.qualityDecline },
                { label: 'Rejection risks', items: alerts.rejectionRisks },
              ].map((section) => (
                <div key={section.label}>
                  <p className="text-sm font-semibold text-foreground">{section.label}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card data-testid="manager-analytics-summary-active-projects">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Active projects</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {formatNumber.format(summary.activeProjects)}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card data-testid="manager-analytics-summary-active-workers">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Active workers</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {formatNumber.format(summary.activeWorkers)}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card data-testid="manager-analytics-summary-tasks-today">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasks today</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {formatNumber.format(summary.tasksToday)}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card data-testid="manager-analytics-summary-tasks-week">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasks this week</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {formatNumber.format(summary.tasksThisWeek)}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card data-testid="manager-analytics-summary-quality-score">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg quality score</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {summary.averageQualityScore != null ? `${summary.averageQualityScore}%` : '—'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="manager-analytics-chart-project-progress">
              <CardHeader>
                <CardTitle>Project progress</CardTitle>
                <CardDescription>Tasks completed per project (last 2 weeks)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {charts.projectProgress.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Not enough data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.projectProgress}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="projectName" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="manager-analytics-chart-worker-distribution">
              <CardHeader>
                <CardTitle>Top worker throughput</CardTitle>
                <CardDescription>Most productive workers (last 2 weeks)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {charts.workerDistribution.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Not enough data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.workerDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="workerName" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="manager-analytics-chart-quality-trend">
              <CardHeader>
                <CardTitle>Quality trend</CardTitle>
                <CardDescription>Average quality score over time</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {charts.qualityTrend.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Not enough data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.qualityTrend}>
                      <defs>
                        <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="var(--primary)" fill="url(#qualityGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="manager-analytics-chart-task-velocity">
              <CardHeader>
                <CardTitle>Task completion velocity</CardTitle>
                <CardDescription>Daily tasks across the workspace</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {charts.taskVelocity.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Not enough data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.taskVelocity}>
                      <defs>
                        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="tasks" stroke="var(--secondary)" fill="url(#velocityGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No analytics available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagerAnalyticsPage;
