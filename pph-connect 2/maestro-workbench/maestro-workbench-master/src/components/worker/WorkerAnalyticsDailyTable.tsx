import React, { FC, useMemo, useState } from 'react';
import {
  ColumnDef,
  Column,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { WorkerDailyActivity } from '@/integrations/supabase/types';

interface WorkerAnalyticsDailyTableProps {
  dailyActivity: WorkerDailyActivity[];
}

type WorkerDailyActivityRow = WorkerDailyActivity & { id: string };

const columns: ColumnDef<WorkerDailyActivityRow>[] = [
  {
    accessorKey: 'activity_date',
    header: ({ column }) => <SortButton column={column} label="Date" />,
    cell: ({ row }) => new Date(row.original.activity_date).toLocaleDateString(),
  },
  {
    accessorKey: 'project_name',
    header: ({ column }) => <SortButton column={column} label="Project" />,
    cell: ({ row }) => row.original.project_name ?? 'No Project',
  },
  {
    accessorKey: 'tasks_completed',
    header: ({ column }) => <SortButton column={column} label="Tasks" align="right" />,
    cell: ({ row }) => <div className="text-right font-medium">{row.original.tasks_completed}</div>,
  },
  {
    accessorKey: 'total_answer_time_seconds',
    header: ({ column }) => <SortButton column={column} label="Total Answer Time" align="right" />,
    cell: ({ row }) => <div className="text-right">{formatTotalAnswerTime(row.original.total_answer_time_seconds)}</div>,
  },
  {
    accessorKey: 'avg_answer_time_seconds',
    header: ({ column }) => <SortButton column={column} label="Avg AHT" align="right" />,
    cell: ({ row }) => <div className="text-right">{formatAverageAht(row.original.avg_answer_time_seconds)}</div>,
  },
];

const WorkerAnalyticsDailyTable: FC<WorkerAnalyticsDailyTableProps> = ({ dailyActivity }) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'activity_date', desc: true }]);
  const tableData = useMemo<WorkerDailyActivityRow[]>(
    () =>
      dailyActivity.map((item, index) => ({
        ...item,
        id: `${item.activity_date}-${item.project_id}-${index}`,
      })),
    [dailyActivity]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={getHeaderAlignment(header.column.id)}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={getHeaderAlignment(cell.column.id)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No activity found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const SortButton: FC<{ column: Column<WorkerDailyActivityRow, unknown>; label: string; align?: 'left' | 'right' }> = ({ column, label, align = 'left' }) => {
  const sorted = column.getIsSorted();
  const handleClick = () => column.toggleSorting(sorted === 'asc');

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={`h-auto p-0 font-semibold inline-flex items-center gap-1 ${align === 'right' ? 'justify-end ml-auto' : 'justify-start'}`}
    >
      <span>{label}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};

const getHeaderAlignment = (columnId: string) => {
  if (columnId === 'tasks_completed' || columnId === 'total_answer_time_seconds' || columnId === 'avg_answer_time_seconds') {
    return 'text-right';
  }
  return '';
};

const formatTotalAnswerTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    const minutePart = minutes > 0 ? `${minutes}m` : '';
    const secondPart = remainingSeconds > 0 ? ` ${remainingSeconds}s` : '';
    return `${hours}h${minutePart ? ` ${minutePart}` : ''}${secondPart}`.trim();
  }

  if (minutes > 0) {
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
  }

  return `${remainingSeconds}s`;
};

const formatAverageAht = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return '0s';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
  }

  return `${remainingSeconds}s`;
};

export default WorkerAnalyticsDailyTable;

