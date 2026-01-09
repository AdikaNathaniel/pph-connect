import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreHorizontal, Eye, Pencil, Briefcase, UserCog, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/status/StatusBadge';
import BGCStatusIcon from '@/components/status/BGCStatusIcon';
import { Badge } from '@/components/ui/badge';

export type WorkerRow = {
  id: string;
  hr_id: string;
  full_name: string;
  status?: string | null;
  current_email?: string | null;
  country?: string | null;
  locale?: string | null;
  hire_date?: string | null;
  bgc_expiration_date?: string | null;
  access?: {
    allowed: boolean;
    reasons: string[];
    quality_score?: number | null;
    quality_threshold?: number | null;
  };
};

export type WorkersTableFilters = {
  statuses?: string[];
  countries?: string[];
  locales?: string[];
};

type BulkAction =
  | 'update-status'
  | 'assign-project'
  | 'export-selected'
  | 'delete-selected';

export const CLIENT_FILTER_THRESHOLD = 500;
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_ROWS_PER_PAGE = ROWS_PER_PAGE_OPTIONS[1];

const normalizeFilterValues = (values?: string[]) =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

const matchesStringFilter = (value: string | null | undefined, allowed: string[]) => {
  if (allowed.length === 0) {
    return true;
  }

  const normalizedValue = (value ?? '').toString().trim();
  return allowed.includes(normalizedValue);
};

export interface WorkersTableProps {
  data?: WorkerRow[];
  filters?: WorkersTableFilters;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  isLoading?: boolean;
  onEditWorker?: (worker: WorkerRow) => void;
}

const columnHelper = createColumnHelper<WorkerRow>();

const SortingIndicator: React.FC<{ direction: 'asc' | 'desc' | false }> = ({ direction }) => {
  if (direction === 'asc') {
    return <span aria-hidden="true">↑</span>;
  }
  if (direction === 'desc') {
    return <span aria-hidden="true">↓</span>;
  }
  return <span aria-hidden="true" className="opacity-30">↕</span>;
};

const sortableHeader = (label: string) => ({ column }: { column: any }) => {
  const direction = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <span>{label}</span>
      <SortingIndicator direction={direction} />
    </button>
  );
};

type WorkersTableRowProps = {
  row: Row<WorkerRow>;
};

const areWorkerRowsEqual = (previous: WorkersTableRowProps, next: WorkersTableRowProps) => {
  if (previous.row === next.row) {
    return true;
  }

  if (previous.row.id !== next.row.id) {
    return false;
  }

  if (previous.row.original !== next.row.original) {
    return false;
  }

  if (previous.row.getIsSelected() !== next.row.getIsSelected()) {
    return false;
  }

  return true;
};

const WorkersTableRow = React.memo(({ row }: WorkersTableRowProps) => (
  <TableRow className="border-border/40">
    {row.getVisibleCells().map((cell) => (
      <TableCell key={cell.id} className="px-3 py-2 align-middle">
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </TableCell>
    ))}
  </TableRow>
), areWorkerRowsEqual);

WorkersTableRow.displayName = 'WorkersTableRow';

export const WorkersTable: React.FC<WorkersTableProps> = ({
  data = [],
  filters,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  onEditWorker
}) => {
  const navigate = useNavigate();
  const memoizedData = useMemo(() => data, [data]);
  const shouldFilterClientSide = memoizedData.length <= CLIENT_FILTER_THRESHOLD;
  const canFilter = shouldFilterClientSide && filters;
  const toggleProjectSelection = useCallback((projectId: string) => {
    setSelectedProjects((previous) =>
      previous.includes(projectId)
        ? previous.filter((value) => value !== projectId)
        : [...previous, projectId]
    );
  }, []);
  const filteredData = useMemo(() => {
    if (!canFilter) {
      return memoizedData;
    }

    const { statuses = [], countries = [], locales = [] } = canFilter;
    const normalizedStatuses = normalizeFilterValues(statuses);
    const normalizedCountries = normalizeFilterValues(countries);
    const normalizedLocales = normalizeFilterValues(locales);

    if (
      normalizedStatuses.length === 0 &&
      normalizedCountries.length === 0 &&
      normalizedLocales.length === 0
    ) {
      return memoizedData;
    }

    return memoizedData.filter((row) => {
      if (!matchesStringFilter(row.status ?? null, normalizedStatuses)) {
        return false;
      }
      if (!matchesStringFilter(row.country ?? null, normalizedCountries)) {
        return false;
      }
      if (!matchesStringFilter(row.locale ?? null, normalizedLocales)) {
        return false;
      }
      return true;
    });
  }, [memoizedData, canFilter]);
  const [internalPage, setInternalPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const [activeBulkAction, setActiveBulkAction] = useState<BulkAction | null>(null);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('active');
  const [assignWorker, setAssignWorker] = useState<WorkerRow | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<string>('');
  const statusOptions = useMemo(
    () => ['pending', 'active', 'inactive', 'terminated'],
    []
  );
  const projectOptions = useMemo(
    () => [
      { id: 'atlas', label: 'Project Atlas' },
      { id: 'beacon', label: 'Project Beacon' },
      { id: 'comet', label: 'Project Comet' }
    ],
    []
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const effectivePageSize = pageSize ?? internalPageSize;
  const effectivePage = page ?? internalPage;
  const totalRows = totalCount ?? filteredData.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / Math.max(effectivePageSize, 1)));
  const applyClientPagination = page === undefined && pageSize === undefined;
  const skeletonRows = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: Math.min(effectivePageSize, 5) });
    }
    return [];
  }, [effectivePageSize, isLoading]);

  useEffect(() => {
    if (effectivePage > pageCount && page === undefined) {
      setInternalPage(pageCount);
    }
  }, [effectivePage, pageCount, page]);

  useEffect(() => {
    if (!assignWorker) {
      setAssignProjectId('');
    }
  }, [assignWorker]);

  const startIndex = totalRows === 0 ? 0 : (effectivePage - 1) * effectivePageSize;
  const visibleRows = useMemo(() => {
    if (!applyClientPagination) {
      return filteredData;
    }

    return filteredData.slice(startIndex, startIndex + effectivePageSize);
  }, [applyClientPagination, effectivePageSize, filteredData, startIndex]);
  const startDisplay = totalRows === 0 ? 0 : startIndex + 1;
  const endDisplay = totalRows === 0 ? 0 : Math.min(startIndex + visibleRows.length, totalRows);
  const summaryText =
    isLoading
      ? 'Loading results…'
      : totalRows === 0
          ? 'Showing 0 results'
          : `Showing ${startDisplay} to ${endDisplay} of ${totalRows} results`;
  const disablePrevious = isLoading || effectivePage <= 1;
  const disableNext = isLoading || effectivePage >= pageCount;

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > pageCount) {
        return;
      }

      if (onPageChange) {
        onPageChange(nextPage);
      }

      if (page === undefined) {
        setInternalPage(nextPage);
      }
    },
    [onPageChange, page, pageCount]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return;
      }

      if (onPageSizeChange) {
        onPageSizeChange(parsed);
      }

      if (pageSize === undefined) {
        setInternalPageSize(parsed);
      }

      if (page === undefined) {
        setInternalPage(1);
      }

      if (onPageChange) {
        onPageChange(1);
      }
    },
    [onPageChange, onPageSizeChange, page, pageSize]
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const table = useReactTable({
    data: visibleRows,
    columns,
    state: {
      sorting,
      rowSelection
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true
  });
  const tableRows = table.getRowModel().rows;
  const selectedCount = table.getSelectedRowModel().flatRows.length;
  const hasSelection = selectedCount > 0;
  const handleViewWorker = useCallback(
    (worker: WorkerRow) => {
      navigate(`/manager/workers/${worker.id}`);
    },
    [navigate]
  );
  const handleManageAccounts = useCallback(
    (worker: WorkerRow) => {
      navigate(`/manager/workers/${worker.id}?tab=accounts`);
    },
    [navigate]
  );
  const openAssignWorker = useCallback((worker: WorkerRow) => {
    setAssignWorker(worker);
  }, []);
  const closeAssignWorker = useCallback(() => {
    setAssignWorker(null);
  }, []);
  const handleAssignSave = useCallback(() => {
    if (!assignWorker || !assignProjectId) {
      return;
    }
    const project = projectOptions.find((option) => option.id === assignProjectId);
    toast.success(
      `Assigned worker ${assignWorker.full_name} to project ${project?.label ?? assignProjectId}.`
    );
    setAssignWorker(null);
  }, [assignProjectId, assignWorker, projectOptions]);
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => {
          const isAllSelected = table.getIsAllRowsSelected();
          const isSomeSelected = table.getIsSomeRowsSelected();
          const checked = isAllSelected ? true : isSomeSelected ? 'indeterminate' : false;

          return (
            <Checkbox
              aria-label="Select all workers"
              data-testid="workers-select-all"
              checked={checked}
              onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select worker ${row.original.full_name}`}
            data-testid="workers-select-row"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false
      }),
      columnHelper.accessor('hr_id', {
        header: sortableHeader('HR ID'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—'
      }),
      columnHelper.accessor('full_name', {
        header: sortableHeader('Name'),
        enableSorting: true,
        cell: (info) => info.getValue()
      }),
      columnHelper.accessor('status', {
        header: sortableHeader('Status'),
        enableSorting: true,
        cell: (info) => <StatusBadge status={info.getValue()} />
      }),
      columnHelper.accessor('current_email', {
        header: sortableHeader('Current Email'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—'
      }),
      columnHelper.accessor('country', {
        header: sortableHeader('Country'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—'
      }),
      columnHelper.accessor('locale', {
        header: sortableHeader('Locale'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—'
      }),
      columnHelper.accessor('hire_date', {
        header: sortableHeader('Hire Date'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—'
      }),
      columnHelper.display({
        id: 'bgcStatus',
        header: 'BGC Status',
        cell: ({ row }) => <BGCStatusIcon expirationDate={row.original.bgc_expiration_date} />
      }),
      columnHelper.display({
        id: 'accessGating',
        header: 'Access Gating',
        cell: ({ row }) => {
          const access = row.original.access;
          if (!access) {
            return <span className="text-muted-foreground">—</span>;
          }

          if (access.allowed) {
            return (
              <Badge data-testid="workers-access-gating-cell" variant="outline">
                Eligible
              </Badge>
            );
          }

          const reasons = access.reasons ?? [];
          const summary = reasons.map((reason) => {
            switch (reason) {
              case 'quality_threshold':
                return 'Quality score below threshold';
              case 'training_incomplete':
                return 'Training gate incomplete';
              case 'missing_skills':
                return 'Missing required skills';
              case 'recent_violation':
                return 'Recent quality violation';
              default:
                return reason;
            }
          });

          return (
            <div data-testid="workers-access-gating-cell" className="space-y-1 text-xs text-muted-foreground">
              <Badge variant="destructive">Blocked</Badge>
              <ul className="list-disc pl-4">
                {summary.map((reason) => (
                  <li key={`${row.id}-${reason}`}>{reason}</li>
                ))}
              </ul>
            </div>
          );
        }
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                data-testid="workers-action-view"
                onSelect={(event) => {
                  event.preventDefault();
                  handleViewWorker(row.original);
                }}
              >
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> View details
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="workers-action-manage-accounts"
                onSelect={(event) => {
                  event.preventDefault();
                  handleManageAccounts(row.original);
                }}
              >
                <UserCog className="mr-2 h-4 w-4" aria-hidden="true" /> Manage accounts
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="workers-action-edit"
                onSelect={(event) => {
                  event.preventDefault();
                  onEditWorker?.(row.original);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Edit worker
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="workers-action-assign"
                onSelect={(event) => {
                  event.preventDefault();
                  openAssignWorker(row.original);
                }}
              >
                <Briefcase className="mr-2 h-4 w-4" aria-hidden="true" /> Assign to project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })
    ],
    [handleManageAccounts, handleViewWorker, openAssignWorker, onEditWorker]
  );
  const resetBulkInputs = useCallback(() => {
    setBulkStatus('active');
    setSelectedProjects([]);
    setDeleteConfirmation('');
  }, []);
  const closeBulkAction = useCallback(() => {
    setActiveBulkAction(null);
    setIsPerformingBulkAction(false);
    resetBulkInputs();
  }, [resetBulkInputs]);
  const runBulkAction = useCallback(
    async (action: BulkAction) => {
      setIsPerformingBulkAction(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        switch (action) {
          case 'update-status':
            toast.success(
              `Updated status to ${bulkStatus} for ${selectedCount} worker${selectedCount === 1 ? '' : 's'}.`
            );
            break;
          case 'assign-project':
            toast.success(
              selectedProjects.length > 0
                ? `Assigned ${selectedCount} worker${selectedCount === 1 ? '' : 's'} to ${selectedProjects.length} project${selectedProjects.length === 1 ? '' : 's'}.`
                : `No projects selected. Nothing changed.`
            );
            break;
          case 'export-selected':
            toast.success(
              `Exported ${selectedCount} worker${selectedCount === 1 ? '' : 's'} to CSV.`
            );
            break;
          case 'delete-selected':
            toast.success(
              `Deleted ${selectedCount} worker${selectedCount === 1 ? '' : 's'} from the workspace.`
            );
            break;
        }
        table.resetRowSelection();
        closeBulkAction();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to complete bulk action. Please try again.';
        toast.error(message);
        setIsPerformingBulkAction(false);
      }
    },
    [bulkStatus, closeBulkAction, selectedCount, selectedProjects, table]
  );
  const handleBulkActionSelect = useCallback(
    (action: BulkAction) => {
      if (action === 'export-selected') {
        void runBulkAction(action);
        return;
      }
      resetBulkInputs();
      setActiveBulkAction(action);
      setIsPerformingBulkAction(false);
    },
    [resetBulkInputs, runBulkAction]
  );

  return (
    <div className="flex flex-col gap-4">
      <Table className="rounded-lg border border-border/60 text-sm">
        <TableHeader className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading &&
            skeletonRows.map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`} className="border-border/40">
                {Array.from({ length: columns.length }).map((__, cellIndex) => (
                  <TableCell key={`skeleton-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-middle">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!isLoading &&
            tableRows.map((row) => (
              <WorkersTableRow key={row.id} row={row} />
            ))}
          {!isLoading && tableRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                  <span className="text-base font-medium text-foreground">No workers match your filters</span>
                  <p className="text-sm text-muted-foreground">
                    Try clearing the search or adjusting filters to explore more of the workforce directory.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <span>{summaryText}</span>
          {hasSelection && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="workers-selection-summary"
                className="text-sm font-medium text-primary"
              >
                {selectedCount} {selectedCount === 1 ? 'worker' : 'workers'} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="workers-bulk-actions-trigger"
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    Bulk Actions
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleBulkActionSelect('update-status');
                    }}
                  >
                    Update Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleBulkActionSelect('assign-project');
                    }}
                  >
                    Assign to Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleBulkActionSelect('export-selected');
                    }}
                  >
                    Export Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      handleBulkActionSelect('delete-selected');
                    }}
                  >
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={String(effectivePageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[96px]" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(effectivePage - 1)}
              disabled={disablePrevious}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="min-w-[68px] text-center font-medium text-foreground">
              {totalRows === 0 ? '0 / 0' : `${effectivePage} / ${pageCount}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(effectivePage + 1)}
              disabled={disableNext}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!assignWorker}
        onOpenChange={(open) => {
          if (!open) {
            closeAssignWorker();
          }
        }}
      >
        <DialogContent data-testid="workers-assign-dialog">
          <DialogHeader>
            <DialogTitle>Assign worker</DialogTitle>
            <DialogDescription>
              Choose a project for {assignWorker?.full_name ?? 'the selected worker'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project</label>
              <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAssignWorker}>
              Cancel
            </Button>
            <Button
              data-testid="workers-assign-save"
              onClick={handleAssignSave}
              disabled={!assignProjectId}
            >
              Assign worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeBulkAction === 'update-status'}
        onOpenChange={(open) => {
          if (!open && !isPerformingBulkAction) {
            closeBulkAction();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update worker status</DialogTitle>
            <DialogDescription>
              Select a new status to apply to all {selectedCount} selected worker
              {selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeBulkAction}
              disabled={isPerformingBulkAction}
            >
              Cancel
            </Button>
            <Button
              data-testid="bulk-update-status-confirm"
              onClick={() => runBulkAction('update-status')}
              disabled={isPerformingBulkAction}
            >
              {isPerformingBulkAction ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeBulkAction === 'assign-project'}
        onOpenChange={(open) => {
          if (!open && !isPerformingBulkAction) {
            closeBulkAction();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign selected workers</DialogTitle>
            <DialogDescription>
              Choose one or more projects to assign all {selectedCount} selected worker
              {selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pick the projects that should receive these assignments.
            </p>
            <div className="grid gap-2">
              {projectOptions.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background p-2"
                >
                  <Checkbox
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => toggleProjectSelection(project.id)}
                  />
                  <span className="text-sm font-medium text-foreground">{project.label}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeBulkAction}
              disabled={isPerformingBulkAction}
            >
              Cancel
            </Button>
            <Button
              data-testid="bulk-assign-project-confirm"
              onClick={() => runBulkAction('assign-project')}
              disabled={isPerformingBulkAction || selectedProjects.length === 0}
            >
              {isPerformingBulkAction ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Assign projects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeBulkAction === 'delete-selected'}
        onOpenChange={(open) => {
          if (!open && !isPerformingBulkAction) {
            closeBulkAction();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected workers</DialogTitle>
            <DialogDescription>
              This action permanently removes {selectedCount} worker{selectedCount === 1 ? '' : 's'}.
              Type <span className="font-semibold text-destructive">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value.trim())}
              placeholder="Type DELETE to confirm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeBulkAction}
              disabled={isPerformingBulkAction}
            >
              Cancel
            </Button>
            <Button
              data-testid="bulk-delete-confirm"
              variant="destructive"
              onClick={() => runBulkAction('delete-selected')}
              disabled={isPerformingBulkAction || deleteConfirmation !== 'DELETE'}
            >
              {isPerformingBulkAction ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete workers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkersTable;
