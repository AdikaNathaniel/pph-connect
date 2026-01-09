import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Filter } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

interface AnswerData {
  id: string;
  task_id: string;
  worker_id: string;
  project_id: string;
  answer_data: any;
  start_time: string;
  completion_time: string;
  aht_seconds: number;
  created_at: string;
  worker_email: string;
  worker_name: string;
  project_name: string;
  task_row_index?: number;
  task_data?: any;
}

interface Project {
  id: string;
  name: string;
}

const Stats = () => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadProjects();
    loadAnswers();
  }, []);

  useEffect(() => {
    loadAnswers();
  }, [selectedProject, startDate, endDate]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error("Failed to load projects");
    }
  };

  const loadAnswers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('answers')
        .select(`
          *,
          profiles!answers_worker_id_fkey(email, full_name),
          projects!answers_project_id_fkey(name),
          questions!answers_question_id_fkey(row_index, data)
        `)
        .order('completion_time', { ascending: false });

      // Apply project filter
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      // Apply date filters
      if (startDate) {
        query = query.gte('completion_time', startDate);
      }
      if (endDate) {
        query = query.lte('completion_time', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: AnswerData[] = (data || []).map((item: any) => ({
        id: item.id,
        task_id: item.question_id, // Using question_id as task_id for compatibility
        worker_id: item.worker_id,
        project_id: item.project_id,
        answer_data: item.answer_data,
        start_time: item.start_time,
        completion_time: item.completion_time,
        aht_seconds: item.aht_seconds,
        created_at: item.created_at,
        worker_email: item.profiles?.email || 'Unknown',
        worker_name: item.profiles?.full_name || 'Unknown',
        project_name: item.projects?.name || 'Unknown',
        task_row_index: item.questions?.row_index,
        task_data: item.questions?.data,
      }));

      setAnswers(formattedData);
    } catch (error) {
      console.error('Error loading answers:', error);
      toast.error("Failed to load answer statistics");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Answer ID',
      'Task ID',
      'Task Row',
      'Worker Email',
      'Worker Name',
      'Project Name',
      'Start Time',
      'Completion Time',
      'AHT (seconds)',
      'Wikipedia Article',
      'Wikipedia Section',
      'Wikipedia Section Link',
      'Question',
      'Answer',
      'Notes/Context',
      'Answer Data (JSON)'
    ];

    const rows = answers.map(a => {
      const d = a.task_data || {};
      const get = (k: string) => d[k] ?? d[k.toLowerCase()] ?? '';
      return [
        a.id,
        a.task_id,
        a.task_row_index ?? '',
        a.worker_email,
        a.worker_name,
        a.project_name,
        format(new Date(a.start_time), 'yyyy-MM-dd HH:mm:ss'),
        format(new Date(a.completion_time), 'yyyy-MM-dd HH:mm:ss'),
        a.aht_seconds,
        get('Wikipedia Article'),
        get('Wikipedia Section'),
        get('Wikipedia Section Link'),
        get('Question'),
        get('Answer'),
        get('Notes/Context'),
        JSON.stringify(a.answer_data)
      ];
    });

    const csv = [headers, ...rows]
      .map(r => r.map(esc).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `answer-stats-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const clearFilters = () => {
    setSelectedProject('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={downloadCSV} disabled={answers.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{answers.length}</div>
            <p className="text-muted-foreground">Total Answers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {answers.length > 0 ? formatDuration(Math.round(answers.reduce((sum, a) => sum + a.aht_seconds, 0) / answers.length)) : '0m 0s'}
            </div>
            <p className="text-muted-foreground">Avg AHT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {new Set(answers.map(a => a.worker_id)).size}
            </div>
            <p className="text-muted-foreground">Unique Workers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {new Set(answers.map(a => a.project_id)).size}
            </div>
            <p className="text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Answers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Answer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading answers...</p>
            </div>
          ) : answers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No answers found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Answer ID</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Completion Time</TableHead>
                    <TableHead>AHT</TableHead>
                    <TableHead>Answer Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answers.map((answer) => (
                    <TableRow key={answer.id}>
                      <TableCell className="font-mono text-xs">
                        {answer.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{answer.worker_name}</div>
                          <div className="text-sm text-muted-foreground">{answer.worker_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{answer.project_name}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(answer.completion_time), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatDuration(answer.aht_seconds)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {JSON.stringify(answer.answer_data)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;