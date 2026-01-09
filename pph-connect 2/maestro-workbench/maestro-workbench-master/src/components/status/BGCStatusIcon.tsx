import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BGCStatusIconProps {
  expirationDate?: string | null;
}

const getStatus = (expirationDate?: string | null) => {
  if (!expirationDate) {
    return {
      icon: AlertTriangle,
      color: 'text-muted-foreground',
      label: 'No background check on file'
    };
  }

  const today = new Date();
  const expiry = new Date(expirationDate);
  if (Number.isNaN(expiry.getTime())) {
    return {
      icon: AlertTriangle,
      color: 'text-muted-foreground',
      label: 'Invalid expiration date'
    };
  }

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      icon: AlertOctagon,
      color: 'text-destructive',
      label: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`
    };
  }

  if (diffDays <= 30) {
    return {
      icon: AlertTriangle,
      color: 'text-amber-500',
      label: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`
    };
  }

  return {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    label: `Valid until ${expiry.toLocaleDateString()}`
  };
};

export const BGCStatusIcon: React.FC<BGCStatusIconProps> = ({ expirationDate }) => {
  const status = getStatus(expirationDate);
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-testid="bgc-status-icon"
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent bg-transparent',
              status.color === 'text-muted-foreground' && 'border-muted-foreground/40 bg-muted/40',
              status.color === 'text-amber-500' && 'border-amber-200 bg-amber-50',
              status.color === 'text-emerald-500' && 'border-emerald-200 bg-emerald-50',
              status.color === 'text-destructive' && 'border-destructive/60 bg-destructive/10',
              status.color
            )}
            aria-label={status.label}
            aria-live="polite"
          >
            <Icon className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="text-xs">{status.label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BGCStatusIcon;
