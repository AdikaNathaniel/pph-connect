import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Archive, ChevronLeft, ChevronRight } from 'lucide-react';

export type ProjectTeam = {
  id: string;
  name: string;
};

export type ProjectRow = {
  id: string;
  project_code: string;
  project_name: string;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  teams?: ProjectTeam[];
  status?: string | null;
  status_label?: string | null;
  expert_tier?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  worker_count?: number | null;
};

export type ProjectsTableFilters = {
  departmentIds?: string[];
  statuses?: string[];
  teamIds?: string[];
  expertTiers?: string[];
};

export interface ProjectsTableProps {
  data?: ProjectRow[];
  isLoading?: boolean;
  totalCount?: number;
  filters?: ProjectsTableFilters;
  page?: number;
  pageSize?: number;
  onPageChange?: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;
}

const columnHelper = createColumnHelper<ProjectRow>();

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
};

const normalizeFilterValues = (values?: string[]) =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

const matchesStringFilter = (value: string | null | undefined, allowed: string[]) => {
  if (allowed.length === 0) {
    return true;
  }
  const normalizedValue = (value ?? '').toString().trim();
  return allowed.includes(normalizedValue);
};

const matchesTeamFilter = (teams: ProjectTeam[] | undefined, allowed: string[]) => {
  if (allowed.length === 0) {
    return true;
  }
  if (!teams || teams.length === 0) {
    return false;
  }
  return teams.some((team) => allowed.includes(team.id));
};

export const PROJECTS_ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PROJECTS_ROWS_PER_PAGE_OPTIONS[0];

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
      className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      data-testid={`projects-table-sort-${column.id}`}
    >
      <span>{label}</span>
      <SortingIndicator direction={direction} />
    </button>
  );
};

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  data = [],
  isLoading = false,
  totalCount,
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange
}) => {
  const memoizedData = useMemo(() => data, [data]);
  const filteredData = useMemo(() => {
  if (!filters) {
    return memoizedData;
  }
  const departmentIds = normalizeFilterValues(filters.departmentIds);
  const statuses = normalizeFilterValues(filters.statuses);
  const teamIds = normalizeFilterValues(filters.teamIds);
  const expertTiers = normalizeFilterValues(filters.expertTiers);

  if (
    departmentIds.length === 0 &&
    statuses.length === 0 &&
    teamIds.length === 0 &&
    expertTiers.length === 0
  ) {
    return memoizedData;
  }

  return memoizedData.filter((row) => {
    if (!matchesStringFilter(row.department_id ?? null, departmentIds)) {
      return false;
    }
    if (!matchesStringFilter(row.status ?? row.status_label ?? null, statuses)) {
      return false;
    }
    if (!matchesTeamFilter(row.teams, teamIds)) {
      return false;
    }
    if (!matchesStringFilter(row.expert_tier ?? null, expertTiers)) {
      return false;
    }
    return true;
  });
}, [filters, memoizedData]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'project_code', desc: false }]);
  const [internalPage, setInternalPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const effectiveRows = filteredData;
  const totalProjects = typeof totalCount === 'number' ? totalCount : effectiveRows.length;
  const effectivePageSize = pageSize ?? internalPageSize;
  const pageCount = Math.max(1, Math.ceil(Math.max(totalProjects, 1) / Math.max(effectivePageSize, 1)));
  const desiredPage = page ?? internalPage;
  const safePage = Math.min(Math.max(desiredPage, 1), pageCount);

  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * effectivePageSize;
    return effectiveRows.slice(startIndex, startIndex + effectivePageSize);
  }, [effectiveRows, safePage, effectivePageSize]);

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount);
    if (clamped === safePage) {
      return;
    }
    if (onPageChange) {
      onPageChange(clamped);
    } else {
      setInternalPage(clamped);
    }
  };

  const handlePageSizeChange = (nextSize: number) => {
    const normalizedSize = nextSize > 0 ? nextSize : DEFAULT_PAGE_SIZE;
    if (onPageSizeChange) {
      onPageSizeChange(normalizedSize);
    } else {
      setInternalPageSize(normalizedSize);
      setInternalPage(1);
    }
  };

  const table = useReactTable({
    data: paginatedRows,
    state: { sorting },
    onSortingChange: setSorting,
    columns: [
      columnHelper.accessor('project_code', {
        header: sortableHeader('Project Code'),
        cell: ({ row }) => (
          <Link
            to={`/m/projects/${row.original.id}`}
            className="font-medium text-primary underline-offset-4 hover:text-primary/80 hover:underline"
          >
            {row.original.project_code}
          </Link>
        )
      }),
      columnHelper.accessor('project_name', {
        header: sortableHeader('Project Name'),
        cell: ({ row }) => (
          <Link
            to={`/m/projects/${row.original.id}`}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {row.original.project_name}
          </Link>
        )
      }),
      columnHelper.display({
        id: 'department',
        header: () => 'Department',
        cell: ({ row }) => {
          const departmentName = row.original.department_name ?? 'Unassigned';
          const departmentCode = row.original.department_code;
          const label = departmentCode ? `${departmentName} (${departmentCode})` : departmentName;
          if (row.original.department_id) {
            return (
              <Link
                to={`/m/departments/${row.original.department_id}`}
                className="text-sm text-primary underline-offset-4 hover:text-primary/80 hover:underline"
              >
                {label}
              </Link>
            );
          }
          return <span className="text-sm text-muted-foreground">{label}</span>;
        }
      }),
      columnHelper.display({
        id: 'teams',
        header: () => 'Teams',
        cell: ({ row }) => {
          const teams = row.original.teams ?? [];
          if (teams.length === 0) {
            return <span className="text-sm text-muted-foreground">No teams</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {teams.map((team) => (
                <Badge key={team.id} variant="outline">
                  {team.name}
                </Badge>
              ))}
            </div>
          );
        }
      }),
      columnHelper.display({
        id: 'status',
        header: () => 'Status',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.status_label || row.original.status}
          </Badge>
        )
      }),
      columnHelper.accessor('expert_tier', {
        header: () => 'Expert Tier',
        cell: ({ getValue }) => getValue() ?? '—'
      }),
      columnHelper.accessor('start_date', {
        header: sortableHeader('Start Date'),
        cell: ({ getValue }) => formatDate(getValue())
      }),
      columnHelper.accessor('end_date', {
        header: sortableHeader('End Date'),
        cell: ({ getValue }) => formatDate(getValue())
      }),
      columnHelper.accessor('worker_count', {
        header: sortableHeader('Worker Count'),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.worker_count ?? 0}</Badge>
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: () => 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const tableRows = table.getRowModel().rows;
  const isEmpty = tableRows.length === 0 && !isLoading;

  return (
    <div className="rounded-md border border-border/60" data-testid="projects-table">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={10}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : isEmpty ? (
            <TableRow>
              <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                No projects match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            tableRows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle text-sm text-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="space-y-3 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            Showing <strong>{paginatedRows.length}</strong> of <strong>{totalProjects}</strong> projects
          </div>
          {sorting.length > 0 ? (
            <div>
              Sorted by <strong>{sorting[0].id}</strong> {sorting[0].desc ? '(desc)' : '(asc)'}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(effectivePageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[120px]" data-testid="projects-pagination-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECTS_ROWS_PER_PAGE_OPTIONS.map((option) => (
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
              data-testid="projects-pagination-prev"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page <strong>{safePage}</strong> of <strong>{pageCount}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              data-testid="projects-pagination-next"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsTable;
