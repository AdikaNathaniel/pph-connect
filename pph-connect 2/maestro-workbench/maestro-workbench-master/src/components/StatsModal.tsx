import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Clock, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface StatsData {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalWorkers: number;
  activeWorkers: number;
  avgCompletionTime: number;
  topWorkers: Array<{
    name: string;
    completedTasks: number;
    avgTime: number;
  }>;
  projectStats: Array<{
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
    status: string;
  }>;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*');

      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('*');

      // Fetch answers for worker stats  
      const { data: taskAnswers } = await supabase
        .from('answers')
        .select('worker_id, aht_seconds, completion_time');

      // Fetch questions for completion data
      const { data: tasks } = await supabase
        .from('questions')
        .select('*, project_id');

      const workers = users?.filter(u => u.role === 'worker') || [];
      const activeProjects = projects?.filter(p => p.status === 'active') || [];
      const completedTasks = tasks?.filter(t => t.is_answered === true) || [];
      
      // Calculate worker stats
      const workerStatsMap = new Map();
      taskAnswers?.forEach(answer => {
        if (!workerStatsMap.has(answer.worker_id)) {
          workerStatsMap.set(answer.worker_id, {
            completedTasks: 0,
            totalTime: 0
          });
        }
        const stats = workerStatsMap.get(answer.worker_id);
        stats.completedTasks++;
        stats.totalTime += answer.aht_seconds;
      });

      const topWorkers = Array.from(workerStatsMap.entries())
        .map(([workerId, stats]: [string, any]) => {
          const user = users?.find(u => u.id === workerId);
          return {
            name: user?.full_name || 'Unknown',
            completedTasks: stats.completedTasks,
            avgTime: Math.round(stats.totalTime / stats.completedTasks)
          };
        })
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5);

      const avgCompletionTime = taskAnswers?.length 
        ? Math.round(taskAnswers.reduce((sum, answer) => sum + answer.aht_seconds, 0) / taskAnswers.length)
        : 0;

      const projectStats = projects?.map(project => ({
        id: project.id,
        name: project.name,
        totalTasks: project.total_tasks || 0,
        completedTasks: project.completed_tasks || 0,
        progress: project.total_tasks ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0,
        status: project.status
      })) || [];

      setStats({
        totalProjects: projects?.length || 0,
        activeProjects: activeProjects.length,
        totalTasks: projects?.reduce((sum, p) => sum + (p.total_tasks || 0), 0) || 0,
        completedTasks: projects?.reduce((sum, p) => sum + (p.completed_tasks || 0), 0) || 0,
        totalWorkers: workers.length,
        activeWorkers: workerStatsMap.size,
        avgCompletionTime,
        topWorkers,
        projectStats
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const downloadStats = () => {
    if (!stats) return;

    const csvContent = [
      'Workspace Statistics',
      '',
      'Overall Stats',
      `Total Projects,${stats.totalProjects}`,
      `Active Projects,${stats.activeProjects}`,
      `Total Tasks,${stats.totalTasks}`,
      `Completed Tasks,${stats.completedTasks}`,
      `Total Workers,${stats.totalWorkers}`,
      `Active Workers,${stats.activeWorkers}`,
      `Average Completion Time (seconds),${stats.avgCompletionTime}`,
      '',
      'Top Workers',
      'Name,Completed Tasks,Avg Time (seconds)',
      ...stats.topWorkers.map(worker => 
        `${worker.name},${worker.completedTasks},${worker.avgTime}`
      ),
      '',
      'Project Details',
      'Name,Total Tasks,Completed Tasks,Progress %,Status',
      ...stats.projectStats.map(project => 
        `${project.name},${project.totalTasks},${project.completedTasks},${project.progress},${project.status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_stats_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Workspace Statistics</DialogTitle>
            <Button 
              variant="outline" 
              onClick={downloadStats}
              disabled={!stats}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <div className="ml-3">
                      <p className="text-xs text-muted-foreground">Projects</p>
                      <p className="text-lg font-bold">{stats.activeProjects}/{stats.totalProjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div className="ml-3">
                      <p className="text-xs text-muted-foreground">Tasks</p>
                      <p className="text-lg font-bold">{stats.completedTasks}/{stats.totalTasks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 text-info" />
                    <div className="ml-3">
                      <p className="text-xs text-muted-foreground">Workers</p>
                      <p className="text-lg font-bold">{stats.activeWorkers}/{stats.totalWorkers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-6 w-6 text-warning" />
                    <div className="ml-3">
                      <p className="text-xs text-muted-foreground">Avg AHT</p>
                      <p className="text-lg font-bold">{stats.avgCompletionTime}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Workers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topWorkers.map((worker, index) => (
                    <div key={worker.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{worker.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {worker.completedTasks} tasks • {worker.avgTime}s avg
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.projectStats.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{project.name}</span>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {project.completedTasks}/{project.totalTasks} tasks completed
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{project.progress}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No statistics available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StatsModal;