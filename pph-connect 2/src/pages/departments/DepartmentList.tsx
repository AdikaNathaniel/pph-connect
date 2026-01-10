import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { Building2 } from 'lucide-react'

type Department = {
  id: string
  department_name: string
  description: string | null
  created_at: string
  teams_count?: number
}

export function DepartmentList() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const { isAdminOrAbove } = useAuth()

  // Fetch departments data (use distinct key since we need more fields than dropdown queries)
  const { data: departments, isLoading, isError, error } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name, description, created_at')
        .order('department_name', { ascending: true })

      if (error) throw error
      return data as Department[]
    },
  })

  // Fetch teams counts per department
  const { data: teamsCounts } = useQuery({
    queryKey: ['departments-teams-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, department_id')

      if (error) throw error

      const counts = new Map()
      data?.forEach((team: any) => {
        counts.set(team.department_id, (counts.get(team.department_id) || 0) + 1)
      })
      return counts
    },
  })

  // Enrich departments with counts
  const enrichedDepartments = useMemo(() => {
    if (!departments) return []

    return departments.map((dept: any) => ({
      ...dept,
      teams_count: teamsCounts?.get(dept.id) || 0,
    }))
  }, [departments, teamsCounts])

  // Column definitions
  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: 'department_name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.department_name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-md text-sm text-muted-foreground truncate">
          {row.original.description || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'teams_count',
      header: 'Teams',
      cell: ({ row }) => <div className="text-sm">{row.original.teams_count || 0}</div>,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const date = row.original.created_at
        return date ? <div className="text-sm">{format(new Date(date), 'MMM d, yyyy')}</div> : <span>-</span>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/departments/${row.original.id}/edit`)
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ]

  // Set up table
  const table = useReactTable({
    data: enrichedDepartments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load departments: {error?.message || 'Unknown error'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage organizational departments ({departments?.length || 0} total)</p>
        </div>
        {isAdminOrAbove && (
          <Button onClick={() => navigate('/departments/create')}>
            <Building2 className="h-4 w-4 mr-2" />
            Create Department
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No departments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
