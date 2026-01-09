import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WorkerDailyActivity } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

interface WorkerAnalyticsDailyTableProps {
  dailyActivity: WorkerDailyActivity[];
}

const WorkerAnalyticsDailyTable: FC<WorkerAnalyticsDailyTableProps> = ({ dailyActivity }) => {
  if (!dailyActivity || dailyActivity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No daily activity data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date and project for better organization
  const groupedData = dailyActivity.reduce((acc, item) => {
    const date = item.activity_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, WorkerDailyActivity[]>);

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead className="text-right">Answer Time</TableHead>
                <TableHead className="text-right">Avg AHT</TableHead>
                <TableHead className="text-right">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDates.map(date => {
                const dayData = groupedData[date];
                const totalTasks = dayData.reduce((sum, item) => sum + item.tasks_completed, 0);
                const totalAnswerTime = dayData.reduce((sum, item) => sum + item.total_answer_time_seconds, 0);
                const avgAHT = totalTasks > 0 ? totalAnswerTime / totalTasks : 0;
                const efficiency = totalTasks > 0 ? Math.round((totalAnswerTime / (totalTasks * 60)) * 100) : 0; // Percentage of 1 minute per task

                return (
                  <React.Fragment key={date}>
                    {dayData.map((item, index) => (
                      <TableRow key={`${date}-${item.project_id}-${index}`}>
                        <TableCell className="font-medium">
                          {index === 0 ? new Date(date).toLocaleDateString() : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.project_name || 'Unknown Project'}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.project_id.substring(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.tasks_completed}</TableCell>
                        <TableCell className="text-right">
                          {Math.round(item.total_answer_time_seconds / 60)}m {item.total_answer_time_seconds % 60}s
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(item.avg_answer_time_seconds)}s
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(efficiency, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {efficiency}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (remainingSeconds) parts.push(`${remainingSeconds}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
};

export default WorkerAnalyticsDailyTable;

