import type { ComponentType } from 'react';
import { Activity, Briefcase, ShieldCheck, Users } from 'lucide-react';
import type { SummaryTrendIntent } from '@/components/patterns/SummaryCard';

export interface SummaryCardDefinition {
  id: string;
  title: string;
  href: string;
  helperText?: string;
  changeIntent?: SummaryTrendIntent;
  changeLabel?: string;
  icon: ComponentType<{ className?: string }>;
}

export const SUMMARY_CARD_CONFIG: SummaryCardDefinition[] = [
  {
    id: 'active-workers',
    title: 'Active Workers',
    href: '/m/workers?status=active',
    helperText: 'Status: active',
    changeIntent: 'positive',
    changeLabel: 'View workers',
    icon: Users
  },
  {
    id: 'active-projects',
    title: 'Active Projects',
    href: '/m/projects?status=active',
    helperText: 'Status: active',
    changeIntent: 'positive',
    changeLabel: 'View projects',
    icon: Briefcase
  },
  {
    id: 'total-teams',
    title: 'Teams',
    href: '/m/teams',
    helperText: 'All teams',
    changeIntent: 'neutral',
    changeLabel: 'Manage teams',
    icon: ShieldCheck
  },
  {
    id: 'pending-workers',
    title: 'Pending Workers',
    href: '/m/workers?status=pending',
    helperText: 'Awaiting onboarding',
    changeIntent: 'neutral',
    changeLabel: 'Review queue',
    icon: Activity
  }
];
