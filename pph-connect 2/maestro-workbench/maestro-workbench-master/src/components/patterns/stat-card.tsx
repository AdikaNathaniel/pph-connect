import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  summary: string;
  metaContext: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  summary, 
  metaContext 
}: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="bg-gradient-to-t from-primary/5 to-transparent">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Top row: Title with icon and Trend Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          {trend && (
            <div className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground ml-2">
              <TrendIcon className="size-3" />
              {trend.value}
            </div>
          )}
        </div>
        
        {/* Main metric - consistent positioning */}
        <div className="text-3xl font-bold mt-4 flex items-center min-h-[2.25rem]">{value}</div>
        
        {/* Bottom section - pushed to bottom with consistent spacing */}
        <div className="mt-auto">
          {/* Trend summary with icon */}
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon className="h-3 w-3" />
            <span className="text-sm">{summary}</span>
          </div>
          
          {/* Meta context */}
          <p className="text-xs text-muted-foreground mt-1">{metaContext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

