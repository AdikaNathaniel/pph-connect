import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SummaryTrendIntent = 'positive' | 'negative' | 'neutral';

export interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  changeLabel?: string;
  changeIntent?: SummaryTrendIntent;
  helperText?: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

const intentVariant: Record<SummaryTrendIntent, 'default' | 'secondary' | 'destructive'> = {
  positive: 'default',
  neutral: 'secondary',
  negative: 'destructive'
};

const TrendBadge: React.FC<{ intent: SummaryTrendIntent; label: string }> = ({ intent, label }) => (
  <Badge variant={intentVariant[intent]} className="gap-1 text-xs">
    <ArrowUpRight className={cn('h-3 w-3', intent === 'negative' && 'rotate-90')} aria-hidden="true" />
    {label}
  </Badge>
);

const SummaryCardBody: React.FC<SummaryCardProps> = ({
  title,
  value,
  changeLabel,
  changeIntent = 'neutral',
  helperText,
  icon: Icon,
  isError,
  errorMessage
}) => {
  if (isError) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">{title}</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-destructive">{errorMessage ?? 'We could not load this metric.'}</p>
          {helperText && <p className="text-xs text-destructive/80">{helperText}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm transition-colors hover:border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Minus className="h-4 w-4 text-muted-foreground opacity-0" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold min-h-[2.75rem]">{value}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {changeLabel ? (
            <TrendBadge intent={changeIntent} label={changeLabel} />
          ) : (
            <span className="text-xs text-muted-foreground/80">Stable</span>
          )}
          {helperText && <span>{helperText}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export const SummaryCardSkeleton: React.FC = () => (
  <Card className="border-border/70 shadow-sm">
    <CardHeader className="space-y-2">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-4 w-8 rounded" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-4 w-32 rounded" />
    </CardContent>
  </Card>
);

export const SummaryCard: React.FC<SummaryCardProps> = (props) => {
  const { href, isLoading, ...rest } = props;

  if (isLoading) {
    return <SummaryCardSkeleton />;
  }

  if (href && !rest.isError) {
    return (
      <Link to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <SummaryCardBody {...rest} />
      </Link>
    );
  }

  return <SummaryCardBody {...rest} />;
};

export default SummaryCard;
