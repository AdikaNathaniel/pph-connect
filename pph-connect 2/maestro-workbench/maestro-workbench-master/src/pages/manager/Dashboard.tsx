import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SummaryCard, SummaryCardSkeleton } from '@/components/patterns/SummaryCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary } from './hooks/useDashboardSummary';
import { SUMMARY_CARD_CONFIG } from './config/summaryCards';
import { useBGCAlerts } from './hooks/useBGCAlerts';
import { QUICK_ACTION_CONFIG } from './config/quickActions';
import QualityAlertsPanel from '@/components/manager/QualityAlertsPanel';

type AlertItem = {
  id: string;
  title: string;
  description: string;
  countLabel: string;
  severity: 'critical' | 'warning' | 'info';
};

export const ALERT_ITEMS: AlertItem[] = [
  {
    id: 'capacity',
    title: 'Capacity updates required',
    description: 'Provide updated demand forecasts for projects trending over capacity.',
    countLabel: 'No projects pending',
    severity: 'info'
  },
  {
    id: 'quality',
    title: 'Quality thresholds breached',
    description: 'Investigate projects returning anomaly alerts before automated actions trigger.',
    countLabel: 'All clear',
    severity: 'critical'
  }
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed);
};

const Dashboard: React.FC = () => {
  const { metrics, isLoading, isError, errorMessage, refresh } = useDashboardSummary();
  const {
    expiringSoon,
    expired,
    isLoadingAlerts,
    isErrorAlerts,
    errorMessageAlerts,
    refreshAlerts
  } = useBGCAlerts();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor workforce health, track compliance, and jump into high-priority actions for your programs.
        </p>
      </header>

      <section aria-labelledby="summary-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 id="summary-heading" className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Summary
            </h2>
            <Badge variant="outline" className="text-[0.65rem]">
              Snapshot
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {isError && (
              <span className="text-xs text-destructive">
                {errorMessage ?? 'Unable to load metrics.'}
              </span>
            )}
            <Button variant="ghost" size="sm" className="text-xs" onClick={refresh}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? SUMMARY_CARD_CONFIG.map((definition) => (
                <SummaryCardSkeleton key={`summary-skeleton-${definition.id}`} />
              ))
            : metrics.map((metric) => <SummaryCard key={metric.id} {...metric} />)}
        </div>
      </section>

      <section aria-labelledby="alerts-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="alerts-heading" className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Alerts
          </h2>
          <Badge variant="secondary" className="text-[0.65rem]">
            Automated monitoring
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <CardTitle className="text-sm font-semibold">Background Checks</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={refreshAlerts}>
                  Refresh
                </Button>
              </div>
              {(isErrorAlerts || errorMessageAlerts) && (
                <p className="text-xs text-destructive">
                  {errorMessageAlerts ?? 'Unable to load background check alerts.'}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={`bgc-skeleton-${index}`} className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <div className="w-24 space-y-2 text-right">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-amber-600">
                      <span>Expiring (30 days)</span>
                      <span>{expiringSoon.length}</span>
                    </div>
                    {expiringSoon.length === 0 ? (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        No background checks expiring in the next 30 days.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {expiringSoon.map((alert) => (
                          <li
                            key={`bgc-expiring-${alert.id}`}
                            className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-amber-900">{alert.fullName}</p>
                              <p className="text-xs text-amber-700">HR #{alert.hrId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-amber-800">
                                {formatDate(alert.expirationDate)}
                              </p>
                              <Link to={`/m/workers/${alert.id}`} className="text-xs font-medium text-primary underline">
                                View
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-destructive">
                      <span>Expired</span>
                      <span>{expired.length}</span>
                    </div>
                    {expired.length === 0 ? (
                      <p className="rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        No workers with expired background checks.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {expired.map((alert) => (
                          <li
                            key={`bgc-expired-${alert.id}`}
                            className="flex items-start justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-destructive">{alert.fullName}</p>
                              <p className="text-xs text-destructive/80">HR #{alert.hrId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-destructive">
                                {formatDate(alert.expirationDate)}
                              </p>
                              <Link to={`/m/workers/${alert.id}`} className="text-xs font-medium text-destructive underline">
                                View
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <QualityAlertsPanel />
          {ALERT_ITEMS.map((alert) => (
            <Card key={alert.id} className="border-border/70">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <CardTitle className="text-sm font-semibold">{alert.title}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{alert.countLabel}</span>
                <Badge variant="outline">{alert.severity}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="quick-actions-heading"
            className="text-xs font-semibold uppercase text-muted-foreground tracking-wide"
          >
            Quick Actions
          </h2>
          <span className="text-xs text-muted-foreground">Handle high-volume workflows faster</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTION_CONFIG.map((action) => {
            const Icon = action.icon;
            const buttonVariant = action.variant === 'primary' ? 'default' : 'outline';
            return (
              <Card key={action.id} className="border-border/70">
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm font-semibold">{action.label}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.helper}</p>
                </CardHeader>
                <CardContent>
                  <Button variant={buttonVariant} size="lg" className="w-full justify-center gap-2" asChild>
                    <Link to={action.href}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{action.variant === 'primary' ? 'Go' : 'Open'}</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
