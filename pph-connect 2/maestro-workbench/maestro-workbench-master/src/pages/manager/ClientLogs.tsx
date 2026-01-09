import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

type ClientLogLevel = 'info' | 'warn' | 'error';

interface ClientLogRow {
  id: string;
  worker_id: string | null;
  worker_email: string | null;
  project_id: string | null;
  level: ClientLogLevel;
  message: string;
  context: string | null;
  metadata: Record<string, unknown> | null;
  stack: string | null;
  occurred_at: string;
  created_at: string;
}

const LEVEL_OPTIONS: ClientLogLevel[] = ['error', 'warn', 'info'];

const ClientLogsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ClientLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<ClientLogLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState<'none' | '30s' | '1m'>('none');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_logs')
        .select(`
          *,
          profiles!client_logs_worker_id_fkey(email)
        `)
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Transform the data to flatten the joined profile email
      const transformedData = (data || []).map((log: any) => ({
        ...log,
        worker_email: log.profiles?.email || null
      }));

      setLogs(transformedData as ClientLogRow[]);
    } catch (error) {
      console.error('Failed to fetch client logs', error);
      toast.error('Failed to load client logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh === 'none') {
      return;
    }

    const intervalMs = autoRefresh === '30s' ? 30_000 : 60_000;
    const id = window.setInterval(() => {
      fetchLogs();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }

      if (projectFilter !== 'all' && log.project_id !== projectFilter) {
        return false;
      }

      if (workerFilter !== 'all' && log.worker_email !== workerFilter) {
        return false;
      }

      const haystack = [log.message, log.context, JSON.stringify(log.metadata), log.stack]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [logs, levelFilter, searchTerm, projectFilter, workerFilter]);

  const exportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.info('No logs to export');
      return;
    }

    const headers = ['Occurred At', 'Level', 'Message', 'Context', 'Worker', 'Project'];
    const rows = filteredLogs.map((log) => [
      log.occurred_at,
      log.level,
      JSON.stringify(log.message ?? ''),
      log.context ?? '',
      log.worker_email ?? '',
      log.project_id ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-logs-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueProjects = useMemo(() => Array.from(new Set(logs.map((log) => log.project_id).filter(Boolean))) as string[], [logs]);
  const uniqueWorkers = useMemo(() => Array.from(new Set(logs.map((log) => log.worker_email).filter(Boolean))) as string[], [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/m/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button onClick={exportCsv} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Select value={levelFilter} onValueChange={(value: ClientLogLevel | 'all') => setLevelFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {uniqueProjects.map((projectId) => (
                  <SelectItem key={projectId} value={projectId}>
                    {projectId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workers</SelectItem>
                {uniqueWorkers.map((workerId) => (
                  <SelectItem key={workerId} value={workerId}>
                    {workerId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search message, context, stack..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <Select value={autoRefresh} onValueChange={(value: 'none' | '30s' | '1m') => setAutoRefresh(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Auto refresh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manual refresh</SelectItem>
                <SelectItem value="30s">Refresh every 30s</SelectItem>
                <SelectItem value="1m">Refresh every 1m</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex justify-center py-12 text-muted-foreground">No client logs match your filters.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(log.occurred_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'outline'}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="break-words max-w-[320px] text-sm">
                        {log.message}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.context ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm">{log.worker_email ?? '-'}</TableCell>
                      <TableCell className="text-sm">{log.project_id ?? '-'}</TableCell>
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

export default ClientLogsPage;

