import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  RefreshCw,
  Settings2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Braces,
  Copy,
} from 'lucide-react';

type QuestionStatusRow =
  Database['public']['Functions']['get_question_status_analytics']['Returns'][number];

interface ProfileInfo {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  modality: string | null;
}

type ProjectRow = {
  id: string;
  name: string;
  task_templates: {
    modality: string | null;
  } | null;
};

interface QuestionStatusTableProps {
  projectId?: string;
  heading?: string | null;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'transcribed', label: 'Transcribed' },
  { value: 'review_pending', label: 'Review pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'qc_ready', label: 'QC ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

const MODALITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'audio-short', label: 'Audio shortform' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'all', label: 'All modalities' },
];

const SORT_COLUMN_MAP: Record<string, string> = {
  question_id: 'question_id',
  project_name: 'project_name',
  current_status: 'current_status',
  audio_asset_status: 'audio_asset_status',
  transcription_submitted_at: 'transcription_submitted_at',
  review_submitted_at: 'review_submitted_at',
  finalized_at: 'finalized_at',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

const PAGE_SIZE = 50;

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'skipped':
      return 'destructive';
    case 'review_pending':
    case 'qc_ready':
      return 'outline';
    case 'reviewed':
    case 'transcribed':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const assetStatusVariant = (status?: string | null) => {
  switch (status) {
    case 'ready':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'transferring':
      return 'outline';
    default:
      return 'secondary';
  }
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'yyyy-MM-dd HH:mm');
  } catch {
    return value;
  }
};

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from && !range?.to) {
    return 'Select range';
  }

  if (range.from && range.to) {
    return `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`;
  }

  return range.from ? format(range.from, 'MMM d, yyyy') : 'Select range';
};

const QuestionStatusTable: React.FC<QuestionStatusTableProps> = ({
  projectId,
  heading = 'Question Status',
}) => {
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId ?? 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('audio-short');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rows, setRows] = useState<QuestionStatusRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updated_at', desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [projectHeading, setProjectHeading] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<QuestionStatusRow | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('transcription');

  const handleCopyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(`Unable to copy ${label}`, error);
      toast.error(`Unable to copy ${label}`);
    }
  }, []);

  const handleCopyJson = useCallback(
    async (payload: Json | null, label: string) => {
      if (payload == null) {
        toast.info(`No ${label.toLowerCase()} JSON available yet`);
        return;
      }

      try {
        const formatted = JSON.stringify(payload, null, 2);
        await navigator.clipboard.writeText(formatted);
        toast.success(`${label} JSON copied to clipboard`);
      } catch (error) {
        console.error(`Unable to copy ${label} JSON`, error);
        toast.error(`Unable to copy ${label} JSON`);
      }
    },
    []
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressPageEffect = useRef<boolean>(false);
  const initialized = useRef<boolean>(false);

  const totalPages = totalRows > 0 ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE)) : 1;
  const projectFilterDisabled = Boolean(projectId);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.current_status] = (acc[row.current_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [rows]);

  const questionSummary = useMemo(
    () =>
      detailRow
        ? [
            { label: 'Question ID', value: detailRow.question_id },
            { label: 'Question UUID', value: detailRow.question_uuid },
            { label: 'Project ID', value: detailRow.project_id },
            { label: 'Project name', value: detailRow.project_name },
            {
              label: 'Current status',
              value: detailRow.current_status,
              display: detailRow.current_status
                ? detailRow.current_status.replace(/_/g, ' ')
                : undefined,
            },
            {
              label: 'Replication index',
              value:
                detailRow.replication_index != null
                  ? String(detailRow.replication_index)
                  : null,
            },
            { label: 'Skip reason', value: detailRow.skip_reason },
            { label: 'Asset source ID', value: detailRow.asset_source_id },
            { label: 'Supabase audio path', value: detailRow.supabase_audio_path },
            { label: 'Audio asset status', value: detailRow.audio_asset_status },
            { label: 'Audio asset error', value: detailRow.audio_asset_error },
            { label: 'Audio file name', value: detailRow.audio_file_name },
            { label: 'Deliverable URL', value: detailRow.deliverable_url },
            {
              label: 'Created at',
              value: detailRow.created_at,
              display: formatDate(detailRow.created_at),
            },
            {
              label: 'Updated at',
              value: detailRow.updated_at,
              display: formatDate(detailRow.updated_at),
            },
            {
              label: 'Finalized at',
              value: detailRow.finalized_at,
              display: formatDate(detailRow.finalized_at),
            },
          ]
        : [],
    [detailRow]
  );

  const stateIdEntries = useMemo(
    () =>
      detailRow
        ? [
            { label: 'Audio asset ID', value: detailRow.audio_asset_id },
            { label: 'Transcriber UUID', value: detailRow.transcriber_uuid },
            { label: 'Transcription task UUID', value: detailRow.transcription_task_uuid },
            { label: 'Transcription answer UUID', value: detailRow.transcription_answer_uuid },
            { label: 'Transcription answer ID', value: detailRow.transcription_answer_id },
            { label: 'Review task UUID', value: detailRow.review_task_uuid },
            { label: 'Review submission UUID', value: detailRow.review_submission_uuid },
            { label: 'Review ID', value: detailRow.review_id },
            { label: 'Reviewer UUID', value: detailRow.reviewer_uuid },
            { label: 'QC record UUID', value: detailRow.qc_record_uuid },
            { label: 'QC ID', value: detailRow.qc_id },
            { label: 'Final answer UUID', value: detailRow.final_answer_uuid },
            { label: 'Final answer ID', value: detailRow.final_answer_id },
          ]
        : [],
    [detailRow]
  );

  const detailTabs = useMemo(() => {
    if (!detailRow) return [];

    const tabs: {
      value: string;
      label: string;
      payload: Json | null;
      copyLabel: string;
      meta: { label: string; value: string | null; display?: string }[];
    }[] = [];

    const transcriberProfile = detailRow.transcriber_uuid
      ? profiles[detailRow.transcriber_uuid]
      : null;
    const reviewerProfile = detailRow.reviewer_uuid
      ? profiles[detailRow.reviewer_uuid]
      : null;

    if (
      detailRow.transcription_answer_uuid ||
      detailRow.transcription_task_uuid ||
      detailRow.transcription_answer_data
    ) {
      tabs.push({
        value: 'transcription',
        label: 'Transcription',
        copyLabel: 'Transcription',
        payload: detailRow.transcription_answer_data ?? null,
        meta: [
          { label: 'Answer ID', value: detailRow.transcription_answer_id },
          { label: 'Answer UUID', value: detailRow.transcription_answer_uuid },
          { label: 'Task UUID', value: detailRow.transcription_task_uuid },
          {
            label: 'Transcriber',
            value: detailRow.transcriber_uuid,
            display: transcriberProfile
              ? `${transcriberProfile.full_name ?? 'Unknown'}${
                  transcriberProfile.email ? ` • ${transcriberProfile.email}` : ''
                }`
              : detailRow.transcriber_uuid,
          },
          {
            label: 'Submitted at',
            value: detailRow.transcription_submitted_at,
            display: formatDate(detailRow.transcription_submitted_at),
          },
        ],
      });
    }

    if (
      detailRow.review_submission_uuid ||
      detailRow.review_task_uuid ||
      detailRow.review_payload
    ) {
      tabs.push({
        value: 'review',
        label: 'Review',
        copyLabel: 'Review',
        payload: detailRow.review_payload ?? null,
        meta: [
          { label: 'Review task UUID', value: detailRow.review_task_uuid },
          { label: 'Review submission UUID', value: detailRow.review_submission_uuid },
          { label: 'Review ID', value: detailRow.review_id },
          {
            label: 'Reviewer',
            value: detailRow.reviewer_uuid,
            display: reviewerProfile
              ? `${reviewerProfile.full_name ?? 'Unknown'}${
                  reviewerProfile.email ? ` • ${reviewerProfile.email}` : ''
                }`
              : detailRow.reviewer_uuid,
          },
          {
            label: 'Submitted at',
            value: detailRow.review_submitted_at,
            display: formatDate(detailRow.review_submitted_at),
          },
        ],
      });
    }

    if (detailRow.final_answer_uuid || detailRow.final_deliverable) {
      tabs.push({
        value: 'final',
        label: 'Final Answer',
        copyLabel: 'Final answer',
        payload: detailRow.final_deliverable ?? null,
        meta: [
          { label: 'Final answer UUID', value: detailRow.final_answer_uuid },
          { label: 'Final answer ID', value: detailRow.final_answer_id },
          {
            label: 'Finalized at',
            value: detailRow.finalized_at,
            display: formatDate(detailRow.finalized_at),
          },
          { label: 'Deliverable URL', value: detailRow.deliverable_url },
        ],
      });
    }

    if (detailRow.qc_record_uuid || detailRow.qc_payload || detailRow.qc_id) {
      tabs.push({
        value: 'qc',
        label: 'QC',
        copyLabel: 'QC',
        payload: detailRow.qc_payload ?? null,
        meta: [
          { label: 'QC record UUID', value: detailRow.qc_record_uuid },
          { label: 'QC ID', value: detailRow.qc_id },
        ],
      });
    }

    return tabs;
  }, [detailRow, profiles]);

  useEffect(() => {
    if (!detailRow) {
      setActiveDetailTab('transcription');
      return;
    }

    if (detailTabs.length > 0) {
      setActiveDetailTab(detailTabs[0].value);
    } else {
      setActiveDetailTab('transcription');
    }
  }, [detailRow, detailTabs]);

  const handleOpenAudio = useCallback((row: QuestionStatusRow) => {
    if (!row.supabase_audio_path) {
      toast.info('No Supabase audio path recorded for this question.');
      return;
    }

    const result = supabase.storage.from('audio-assets').getPublicUrl(row.supabase_audio_path);
    const publicUrl = result.data?.publicUrl;
    if (!publicUrl) {
      toast.error('Unable to build public URL for this audio asset.');
      return;
    }
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const columns = useMemo<ColumnDef<QuestionStatusRow>[]>(
    () => {
      const base: ColumnDef<QuestionStatusRow>[] = [
        {
          id: 'question_id',
          accessorKey: 'question_id',
          header: 'Question',
          enableHiding: false,
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="font-medium">{row.original.question_id}</span>
              <span className="text-xs text-muted-foreground">
                Replication {row.original.replication_index ?? 1}
              </span>
            </div>
          ),
        },
        {
          id: 'current_status',
          accessorKey: 'current_status',
          header: 'Status',
          cell: ({ row }) => (
            <div className="flex flex-col gap-1">
              <Badge variant={statusVariant(row.original.current_status)}>
                {row.original.current_status.replace(/_/g, ' ')}
              </Badge>
              {row.original.skip_reason && (
                <span className="text-xs text-muted-foreground">
                  Skip: {row.original.skip_reason}
                </span>
              )}
            </div>
          ),
        },
        {
          id: 'audio_asset_status',
          accessorKey: 'audio_asset_status',
          header: 'Audio Asset',
          cell: ({ row }) => (
            <div className="flex flex-col gap-1">
              <Badge variant={assetStatusVariant(row.original.audio_asset_status)}>
                {row.original.audio_asset_status ?? 'Drive'}
              </Badge>
              {row.original.audio_asset_error && (
                <span className="text-xs text-destructive">
                  {row.original.audio_asset_error}
                </span>
              )}
              {row.original.audio_file_name && (
                <span className="text-xs text-muted-foreground">
                  {row.original.audio_file_name}
                </span>
              )}
            </div>
          ),
        },
        {
          id: 'transcription_submitted_at',
          accessorKey: 'transcription_submitted_at',
          header: 'Transcriber',
          cell: ({ row }) => {
            const transcriber = row.original.transcriber_uuid
              ? profiles[row.original.transcriber_uuid]
              : null;

            if (!transcriber) {
              return <span className="text-sm text-muted-foreground">—</span>;
            }

            return (
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {transcriber.full_name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {transcriber.email || '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(row.original.transcription_submitted_at)}
                </span>
              </div>
            );
          },
        },
        {
          id: 'review_submitted_at',
          accessorKey: 'review_submitted_at',
          header: 'Reviewer',
          cell: ({ row }) => {
            const reviewer = row.original.reviewer_uuid
              ? profiles[row.original.reviewer_uuid]
              : null;

            if (!reviewer) {
              return <span className="text-sm text-muted-foreground">—</span>;
            }

            return (
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {reviewer.full_name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {reviewer.email || '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(row.original.review_submitted_at)}
                </span>
              </div>
            );
          },
        },
        {
          id: 'updated_at',
          accessorKey: 'updated_at',
          header: 'Updated',
          cell: ({ row }) => (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <span className="font-medium text-foreground mr-1">Updated</span>
                {formatDate(row.original.updated_at)}
              </div>
              <div>
                <span className="font-medium text-foreground mr-1">Finalized</span>
                {formatDate(row.original.finalized_at)}
              </div>
            </div>
          ),
        },
        {
          id: 'actions',
          header: '',
          enableSorting: false,
          enableHiding: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetailRow(row.original)}
              >
                <Braces className="h-4 w-4 mr-2" />
                View JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenAudio(row.original)}
                disabled={!row.original.supabase_audio_path}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open audio
              </Button>
            </div>
          ),
        },
      ];

      if (!projectFilterDisabled) {
        base.splice(1, 0, {
          id: 'project_name',
          accessorKey: 'project_name',
          header: 'Project',
          enableHiding: false,
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="font-medium">{row.original.project_name}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.template_modality}
              </span>
            </div>
          ),
        });
      }

      return base;
    },
    [profiles, projectFilterDisabled, handleOpenAudio, setDetailRow]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
    },
    onColumnVisibilityChange: setColumnVisibility,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.question_uuid,
  });

  const fetchProfiles = useCallback(async (data: QuestionStatusRow[]) => {
    const ids = Array.from(
      new Set(
        data
          .flatMap((row) => [row.transcriber_uuid, row.reviewer_uuid])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (ids.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids);

    if (error) {
      console.error('Failed to load profile information', error);
      toast.error('Unable to load user details');
      return;
    }

    const map = (profilesData || []).reduce<Record<string, ProfileInfo>>((acc, profile) => {
      acc[profile.id] = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
      };
      return acc;
    }, {});

    setProfiles(map);
  }, []);

  const loadQuestionStatus = useCallback(
    async (targetPage: number) => {
      try {
        setLoading(true);

        const activeSort = sorting[0];
        const sortColumn =
          (activeSort && SORT_COLUMN_MAP[activeSort.id]) || 'updated_at';
        const sortDirection = activeSort?.desc ? 'desc' : 'asc';

        const fromIso = dateRange?.from
          ? startOfDay(dateRange.from).toISOString()
          : null;
        const toIso = dateRange?.to
          ? endOfDay(dateRange.to).toISOString()
          : dateRange?.from
          ? endOfDay(dateRange.from).toISOString()
          : null;

        const { data, error } = await supabase.rpc('get_question_status_analytics', {
          p_project_id: selectedProject !== 'all' ? selectedProject : null,
          p_status: selectedStatus !== 'all' ? [selectedStatus] : null,
          p_modality: selectedModality !== 'all' ? [selectedModality] : null,
          p_search: searchTerm.trim() ? searchTerm.trim() : null,
          p_updated_from: fromIso,
          p_updated_to: toIso,
          p_sort_column: sortColumn,
          p_sort_direction: sortDirection,
          p_limit: PAGE_SIZE,
          p_offset: targetPage * PAGE_SIZE,
        });

        if (error) throw error;

        const result = data || [];
        setRows(result);
        if (result.length > 0) {
          setTotalRows(result[0].total_rows ?? result.length);
        } else {
          setTotalRows(0);
        }

        await fetchProfiles(result);
      } catch (error) {
        console.error('Failed to load question status data', error);
        toast.error('Failed to load question status data');
      } finally {
        setLoading(false);
      }
    },
    [
      dateRange,
      fetchProfiles,
      searchTerm,
      selectedModality,
      selectedProject,
      selectedStatus,
      sorting,
    ]
  );

  const loadProjects = useCallback(async () => {
    if (projectId) {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, task_templates:task_templates!projects_template_id_fkey (modality)')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Failed to load project information', error);
        toast.error('Unable to load project');
        return;
      }

      const modality = data?.task_templates?.modality ?? 'audio-short';
      setProjectHeading(data?.name ?? null);
      setProjectOptions([
        {
          id: data.id,
          name: data.name,
          modality,
        },
      ]);
      setSelectedProject(data.id);
      setSelectedModality(modality ?? 'audio-short');
    } else {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, task_templates:task_templates!projects_template_id_fkey (modality)')
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to load projects', error);
        toast.error('Unable to load projects');
        return;
      }

      const options =
        (data as ProjectRow[] | null)?.map((project) => ({
          id: project.id,
          name: project.name,
          modality: project.task_templates?.modality ?? null,
        })) ?? [];

      setProjectOptions(options);
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    const initialise = async () => {
      await loadProjects();
      await loadQuestionStatus(0);
      if (isMounted) {
        initialized.current = true;
      }
    };
    initialise();

    return () => {
      isMounted = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [loadProjects, loadQuestionStatus]);

  useEffect(() => {
    if (!initialized.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      suppressPageEffect.current = true;
      setPage(0);
      loadQuestionStatus(0);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    loadQuestionStatus,
    selectedProject,
    selectedStatus,
    selectedModality,
    searchTerm,
    dateRange,
    sorting,
  ]);

  useEffect(() => {
    if (suppressPageEffect.current) {
      suppressPageEffect.current = false;
      return;
    }
    loadQuestionStatus(page);
  }, [page, loadQuestionStatus]);

  useEffect(() => {
    if (projectFilterDisabled) return;
    if (selectedProject === 'all') return;
    const selected = projectOptions.find((option) => option.id === selectedProject);
    if (selected?.modality && selected.modality !== selectedModality) {
      setSelectedModality(selected.modality);
    }
  }, [selectedProject, projectOptions, projectFilterDisabled, selectedModality]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          {heading && (
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          )}
          {projectHeading && (
            <p className="text-sm text-muted-foreground">
              Showing status for project <span className="font-medium">{projectHeading}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              suppressPageEffect.current = true;
              loadQuestionStatus(page);
            }}
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
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <span className="text-sm font-medium">Project</span>
            <Select
              value={selectedProject}
              onValueChange={(value) => setSelectedProject(value)}
              disabled={projectFilterDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {!projectFilterDisabled && <SelectItem value="all">All projects</SelectItem>}
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Status</span>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Modality</span>
            <Select
              value={selectedModality}
              onValueChange={(value) => setSelectedModality(value)}
              disabled={Boolean(projectId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select modality" />
              </SelectTrigger>
              <SelectContent>
                {MODALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Search</span>
            <Input
              placeholder="Search question ID, project, or asset"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Last Updated</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatRangeLabel(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={setDateRange}
                    defaultMonth={dateRange?.from}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && rows.length === 0 && (
        <Alert>
          <AlertDescription>
            No question status records found for the selected filters yet.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Question Status Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-1',
                              header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-xs text-muted-foreground">
                                {header.column.getIsSorted() === 'asc'
                                  ? '↑'
                                  : header.column.getIsSorted() === 'desc'
                                  ? '↓'
                                  : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {Object.entries(summary).map(([key, value]) => (
            <Badge key={key} variant={statusVariant(key)}>
              {key.replace(/_/g, ' ')}: {value}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page === 0}
            onClick={() => {
              suppressPageEffect.current = false;
              setPage((prev) => Math.max(prev - 1, 0));
            }}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page + 1 >= totalPages}
            onClick={() => {
              suppressPageEffect.current = false;
              setPage((prev) => Math.min(prev + 1, totalPages - 1));
            }}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(detailRow)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Question state details
              {detailRow ? ` · ${detailRow.question_id}` : ''}
            </DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Question</h3>
                  <div className="space-y-2">
                    {questionSummary.map(({ label, value, display }) => {
                      const normalized =
                        typeof value === 'number'
                          ? String(value)
                          : value ?? null;
                      const shown = display ?? (normalized ?? '—');
                      return (
                        <div key={label} className="flex items-start gap-2 text-xs">
                          <span className="w-40 shrink-0 font-medium text-muted-foreground">
                            {label}
                          </span>
                          <div className="flex-1 break-all">{shown}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Copy ${label}`}
                            disabled={!normalized}
                            onClick={() => normalized && handleCopyText(normalized, label)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">State IDs</h3>
                  <div className="space-y-2">
                    {stateIdEntries.map(({ label, value }) => {
                      const normalized = value ?? null;
                      const shown = normalized ?? '—';
                      return (
                        <div key={label} className="flex items-start gap-2 text-xs">
                          <span className="w-40 shrink-0 font-medium text-muted-foreground">
                            {label}
                          </span>
                          <div className="flex-1 break-all">{shown}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Copy ${label}`}
                            disabled={!normalized}
                            onClick={() => normalized && handleCopyText(normalized, label)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {detailTabs.length > 0 ? (
                <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
                  <TabsList>
                    {detailTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {detailTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                      <div className="space-y-2 rounded-lg border p-4">
                        <h4 className="text-sm font-semibold">{tab.label} metadata</h4>
                        <div className="space-y-2">
                          {tab.meta.map(({ label, value, display }) => {
                            const normalized = value ?? null;
                            const shown = display ?? (normalized ?? '—');
                            return (
                              <div key={label} className="flex items-start gap-2 text-xs">
                                <span className="w-48 shrink-0 font-medium text-muted-foreground">
                                  {label}
                                </span>
                                <div className="flex-1 break-all">{shown}</div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={`Copy ${tab.label} ${label}`}
                                  disabled={!normalized}
                                  onClick={() =>
                                    normalized && handleCopyText(normalized, `${tab.label} ${label}`)
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{tab.label} JSON</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={tab.payload == null}
                            onClick={() => handleCopyJson(tab.payload, tab.copyLabel)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy JSON
                          </Button>
                        </div>
                        <ScrollArea className="max-h-[320px] rounded-lg border bg-muted/40">
                          <pre className="whitespace-pre-wrap p-4 text-xs">
                            {tab.payload
                              ? JSON.stringify(tab.payload, null, 2)
                              : 'No JSON payload captured for this state yet.'}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <Alert>
                  <AlertDescription>
                    No stage metadata is available for this question yet.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionStatusTable;
