import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type WorkerStatus = 'pending' | 'active' | 'inactive' | 'terminated' | string;

const STATUS_STYLES: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-100 text-amber-800'
  },
  active: {
    label: 'Active',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-800'
  },
  inactive: {
    label: 'Inactive',
    className: 'border-slate-200 bg-slate-100 text-slate-600'
  },
  terminated: {
    label: 'Terminated',
    className: 'border-red-200 bg-red-100 text-red-800'
  }
};

const DEFAULT_BADGE_STYLE = {
  label: 'Unknown',
  className: 'border-muted-foreground/20 bg-muted text-muted-foreground'
};

export interface StatusBadgeProps {
  status?: WorkerStatus | null;
}

const formatFallbackLabel = (status?: WorkerStatus | null) => {
  if (!status) {
    return DEFAULT_BADGE_STYLE.label;
  }

  const trimmed = String(status).trim();
  if (trimmed.length === 0) {
    return DEFAULT_BADGE_STYLE.label;
  }

  return trimmed
    .split(/[\s_-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status ?? '').toString().trim().toLowerCase();
  const config = STATUS_STYLES[normalized] ?? {
    ...DEFAULT_BADGE_STYLE,
    label: formatFallbackLabel(status)
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize',
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
