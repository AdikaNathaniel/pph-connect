import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SummaryCardProps } from '@/components/patterns/SummaryCard';
import type { SummaryCardDefinition } from '../config/summaryCards';
import { SUMMARY_CARD_CONFIG } from '../config/summaryCards';

export interface DashboardSummaryMetric extends SummaryCardProps {
  id: string;
}

interface DashboardSummaryState {
  metrics: DashboardSummaryMetric[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

const toDisplayCount = (count: number) =>
  Number.isFinite(count) ? Intl.NumberFormat().format(count) : '0';

const createBaseMetrics = (config: SummaryCardDefinition[]): DashboardSummaryMetric[] =>
  config.map((definition) => ({
    id: definition.id,
    title: definition.title,
    value: '—',
    helperText: definition.helperText,
    changeLabel: definition.changeLabel,
    changeIntent: definition.changeIntent,
    href: definition.href,
    icon: definition.icon
  }));

export const useDashboardSummary = (
  config: SummaryCardDefinition[] = SUMMARY_CARD_CONFIG
): DashboardSummaryState => {
  const [metrics, setMetrics] = useState<DashboardSummaryMetric[]>(() => createBaseMetrics(config));
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      const [
        activeWorkers,
        pendingWorkers,
        activeProjects,
        totalTeams
      ] = await Promise.all([
        supabase.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teams').select('*', { count: 'exact', head: true })
      ]);

      const responses = [activeWorkers, pendingWorkers, activeProjects, totalTeams];
      const responseError = responses.find((response) => response.error);
      if (responseError && responseError.error) {
        throw responseError.error;
      }

      const counts = {
        activeWorkers: activeWorkers.count ?? 0,
        pendingWorkers: pendingWorkers.count ?? 0,
        activeProjects: activeProjects.count ?? 0,
        totalTeams: totalTeams.count ?? 0
      };

      const nextMetrics = config.map((definition) => {
        switch (definition.id) {
          case 'active-workers':
            return {
              id: definition.id,
              title: definition.title,
              value: toDisplayCount(counts.activeWorkers),
              helperText: `${counts.activeWorkers === 1 ? 'Worker' : 'Workers'} active now`,
              changeLabel: definition.changeLabel,
              changeIntent: definition.changeIntent ?? 'positive',
              href: definition.href,
              icon: definition.icon
            };
          case 'active-projects':
            return {
              id: definition.id,
              title: definition.title,
              value: toDisplayCount(counts.activeProjects),
              helperText: `${counts.activeProjects === 1 ? 'Project' : 'Projects'} live`,
              changeLabel: definition.changeLabel,
              changeIntent: definition.changeIntent ?? 'positive',
              href: definition.href,
              icon: definition.icon
            };
          case 'total-teams':
            return {
              id: definition.id,
              title: definition.title,
              value: toDisplayCount(counts.totalTeams),
              helperText: `${counts.totalTeams === 1 ? 'Team' : 'Teams'} in network`,
              changeLabel: definition.changeLabel,
              changeIntent: definition.changeIntent ?? 'neutral',
              href: definition.href,
              icon: definition.icon
            };
          case 'pending-workers':
            return {
              id: definition.id,
              title: definition.title,
              value: toDisplayCount(counts.pendingWorkers),
              helperText: `${counts.pendingWorkers === 1 ? 'Worker' : 'Workers'} awaiting approval`,
              changeLabel: definition.changeLabel,
              changeIntent: definition.changeIntent ?? 'neutral',
              href: definition.href,
              icon: definition.icon
            };
          default:
            return {
              id: definition.id,
              title: definition.title,
              value: '0',
              helperText: definition.helperText,
              changeLabel: definition.changeLabel,
              changeIntent: definition.changeIntent,
              href: definition.href,
              icon: definition.icon
            };
        }
      });

      setMetrics(nextMetrics);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch summary metrics right now.';
      setIsError(true);
      setErrorMessage(message);
      setMetrics(
        config.map((definition) => ({
          id: definition.id,
          title: definition.title,
          value: '—',
          helperText: definition.helperText,
          changeLabel: definition.changeLabel,
          changeIntent: definition.changeIntent,
          href: definition.href,
          icon: definition.icon,
          isError: true,
          errorMessage: message
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    metrics,
    isLoading,
    isError,
    errorMessage,
    refresh
  };
};
