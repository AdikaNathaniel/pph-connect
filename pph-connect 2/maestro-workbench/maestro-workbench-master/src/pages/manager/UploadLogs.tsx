import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectOption {
  id: string;
  name: string;
  status: string;
  importExpected: number | null;
  importReady: number | null;
  importFailed: number | null;
}

interface AssetEventRow {
  id: string;
  project_id: string;
  drive_file_id: string | null;
  event_type: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
  projects?: {
    name: string | null;
  } | null;
  audio_assets?: {
    status: string | null;
    drive_file_name: string | null;
    error_message?: string | null;
  } | null;
}

const statusBadgeVariant = (status?: string | null) => {
  switch (status) {
    case 'ready':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'transferring':
    case 'queued':
      return 'outline';
    case 'archived':
      return 'secondary';
    default:
      return 'secondary';
  }
};

interface SelectableTruncateTextProps {
  text: string;
  className?: string;
}

const SelectableTruncateText: React.FC<SelectableTruncateTextProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);
  };

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      className={cn('block max-w-full truncate cursor-text', className)}
      title={text}
    >
      {text}
    </div>
  );
};

const UploadLogs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [events, setEvents] = useState<AssetEventRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [invokingRetry, setInvokingRetry] = useState<boolean>(false);
  const processingRef = useRef(false);

  useEffect(() => {
    const initialProject = searchParams.get('projectId');
    if (initialProject) {
      setSelectedProject(initialProject);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, import_expected_assets, import_ready_assets, import_failed_assets, task_templates:task_templates!projects_template_id_fkey (modality)')
        .eq('task_templates.modality', 'audio-short')
        .order('name');

      if (error) {
        console.error('Failed to load audio projects', error);
        toast.error('Unable to load audio projects');
        return;
      }

      const options = (data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        importExpected: project.import_expected_assets ?? null,
        importReady: project.import_ready_assets ?? null,
        importFailed: project.import_failed_assets ?? null,
      }));

      setProjectOptions(options);
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('audio_asset_events')
          .select(`
            id,
            project_id,
            drive_file_id,
            event_type,
            message,
            metadata,
            recorded_at,
            projects:projects!inner(name),
            audio_assets(status, drive_file_name, error_message)
          `)
          .order('recorded_at', { ascending: false })
          .limit(200);

        if (selectedProject !== 'all') {
          query = query.eq('project_id', selectedProject);
        }

        if (searchTerm.trim()) {
          const value = `%${searchTerm.trim()}%`;
          query = query.or(`(drive_file_id.ilike.${value},message.ilike.${value},audio_assets.drive_file_name.ilike.${value})`);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setEvents((data ?? []) as unknown as AssetEventRow[]);

        let statusQuery = supabase
          .from('audio_assets')
          .select('status');

        if (selectedProject !== 'all') {
          statusQuery = statusQuery.eq('project_id', selectedProject);
        }

        const { data: statusData, error: statusError } = await statusQuery;
        if (statusError) {
          throw statusError;
        }

        const map: Record<string, number> = {};
        (statusData ?? []).forEach((row) => {
          const status = (row as { status: string | null }).status ?? 'unknown';
          map[status] = (map[status] ?? 0) + 1;
        });
        setStatusBreakdown(map);
      } catch (error) {
        console.error('Failed to load upload logs', error);
        toast.error('Failed to load upload logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [selectedProject, searchTerm, refreshCounter]);

  const selectedProjectInfo = useMemo(() => {
    if (selectedProject === 'all') return null;
    return projectOptions.find((project) => project.id === selectedProject) ?? null;
  }, [projectOptions, selectedProject]);

  const summary = useMemo(() => {
    const ready = statusBreakdown['ready'] ?? 0;
    const failed = statusBreakdown['failed'] ?? 0;
    const transferring = statusBreakdown['transferring'] ?? 0;
    const queued = statusBreakdown['queued'] ?? 0;
    const total = Object.values(statusBreakdown).reduce((acc, value) => acc + value, 0);
    const pending = transferring + queued;

    return { ready, failed, transferring, queued, total, pending };
  }, [statusBreakdown]);

  useEffect(() => {
    if (selectedProject === 'all') return;
    if (summary.pending <= 0) return;

    let cancelled = false;

    const runBatch = async () => {
      if (cancelled || processingRef.current) return;
      processingRef.current = true;
      try {
        const { error } = await supabase.functions.invoke('ingest-audio-assets', {
          body: { projectId: selectedProject },
        });
        if (error) {
          console.error('Automatic ingestion batch failed', error);
        }
      } catch (error) {
        console.error('Automatic ingestion batch threw', error);
      } finally {
        processingRef.current = false;
        if (!cancelled) {
          setRefreshCounter((prev) => prev + 1);
        }
      }
    };

    runBatch();
    const interval = setInterval(runBatch, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      processingRef.current = false;
    };
  }, [selectedProject, summary.pending]);

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    if (value === 'all') {
      searchParams.delete('projectId');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ projectId: value }, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Logs</h1>
          <p className="text-sm text-muted-foreground">Monitor Supabase audio ingestion progress and investigate failures.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProject !== 'all' && (
            <Button
              variant="default"
              onClick={async () => {
                if (invokingRetry) return;
                try {
                  setInvokingRetry(true);
                  const { data, error } = await supabase.functions.invoke('ingest-audio-assets', {
                    body: { projectId: selectedProject },
                  });

                  if (error) {
                    throw error;
                  }

                  const processed = data?.processed ?? 0;
                  const ready = data?.readyCount ?? 0;
                  const total = data?.total ?? 0;
                  toast.success(`Processed ${processed} file${processed === 1 ? '' : 's'} (ready ${ready}/${total || '—'})`);
                } catch (error) {
                  console.error('Retry ingestion failed', error);
                  toast.error(error instanceof Error ? error.message : 'Retry failed');
                } finally {
                  setInvokingRetry(false);
                  setRefreshCounter((prev) => prev + 1);
                }
              }}
              disabled={invokingRetry}
            >
              {invokingRetry ? 'Processing…' : 'Process Next Batch'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setRefreshCounter((prev) => prev + 1)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-sm font-medium">Project</span>
            <Select value={selectedProject} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audio projects</SelectItem>
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Search</span>
            <Input
              placeholder="Drive file id or message"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion Summary</CardTitle>
          <CardDescription>
            Current Supabase audio asset counts for {selectedProject === 'all' ? 'all audio projects' : 'the selected project'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <Badge variant="default">Ready: {summary.ready}</Badge>
            <Badge variant="destructive">Failed: {summary.failed}</Badge>
            <Badge variant="outline">Pending: {Math.max(summary.pending, 0)}</Badge>
            <Badge variant="secondary">Transferring: {summary.transferring}</Badge>
            <Badge variant="secondary">Queued: {summary.queued}</Badge>
            <Badge variant="outline">Total tracked: {summary.total}</Badge>
          </div>
          {selectedProjectInfo && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">Expected: {selectedProjectInfo.importExpected ?? '—'}</Badge>
              <Badge variant="outline">Project Ready: {selectedProjectInfo.importReady ?? '—'}</Badge>
              <Badge variant="destructive">Project Failed: {selectedProjectInfo.importFailed ?? 0}</Badge>
              <Badge variant="secondary">Project Status: {selectedProjectInfo.status}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Showing the latest 200 ingestion and cleanup events.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No events recorded yet.</TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const projectName = event.projects?.name ?? 'Unknown project';
                  const assetStatus = event.audio_assets?.status ?? null;
                  const driveName = event.audio_assets?.drive_file_name ?? event.drive_file_id ?? 'Unknown file';
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(event.recorded_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                      <TableCell>{projectName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs h-5 px-2 font-normal">{event.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{driveName}</span>
                          {event.drive_file_id && (
                            <span className="text-xs text-muted-foreground">{event.drive_file_id}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(assetStatus)} className="text-xs h-5 px-2 font-normal">
                          {assetStatus ?? 'n/a'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] align-top">
                        <SelectableTruncateText text={event.message ?? '—'} className="text-sm" />
                        {event.audio_assets?.error_message && (
                          <SelectableTruncateText
                            text={`Storage error: ${event.audio_assets.error_message}`}
                            className="mt-1 text-xs text-destructive"
                          />
                        )}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <SelectableTruncateText
                            text={JSON.stringify(event.metadata)}
                            className="mt-1 text-xs text-muted-foreground"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadLogs;
