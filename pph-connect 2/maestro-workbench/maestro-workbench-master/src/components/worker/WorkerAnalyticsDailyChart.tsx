import { FC, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkerDailyActivity } from '@/integrations/supabase/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface WorkerAnalyticsDailyChartProps {
  data: WorkerDailyActivity[];
}

const WorkerAnalyticsDailyChart: FC<WorkerAnalyticsDailyChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const aggregated = data.reduce<Record<string, number>>((acc, activity) => {
      acc[activity.activity_date] = (acc[activity.activity_date] ?? 0) + activity.tasks_completed;
      return acc;
    }, {});

    return Object.entries(aggregated)
      .map(([date, tasks]) => ({ date, tasks }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Throughput</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm">Complete tasks to populate your daily trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTasks" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '0.5rem' }}
              />
              <Area
                type="monotone"
                dataKey="tasks"
                stroke="var(--primary)"
                fill="url(#colorTasks)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkerAnalyticsDailyChart;

