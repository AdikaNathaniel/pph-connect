import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { X, FolderOpen } from 'lucide-react'

type Project = {
  id: string
  project_code: string
  project_name: string
  department_id: string
  expert_tier: 'tier0' | 'tier1' | 'tier2'
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  created_at: string
  departments?: {
    name: string
  }
}

export function ProjectList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('department') || 'all')

  // Fetch projects data
  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workforce_projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Project[]
    },
  })

  // Fetch departments separately
  const { data: departmentMap } = useQuery({
    queryKey: ['departments-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, department_name')

      if (error) throw error

      // Create a map for quick lookup
      const map = new Map()
      data?.forEach((dept: any) => map.set(dept.id, dept.department_name))
      return map
    },
  })

  // Enrich projects with department names
  const enrichedProjects = useMemo(() => {
    if (!projects || !departmentMap) return projects || []

    return projects.map((project: any) => ({
      ...project,
      departments: project.department_id ? { name: departmentMap.get(project.department_id) || 'Unknown' } : undefined,
    }))
  }, [projects, departmentMap])

  // Fetch departments for filter
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, department_name').order('department_name')

      if (error) throw error
      return data
    },
  })

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (departmentFilter !== 'all') params.set('department', departmentFilter)
    setSearchParams(params, { replace: true })
  }, [searchQuery, statusFilter, departmentFilter, setSearchParams])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!enrichedProjects) return []

    return enrichedProjects.filter((project) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        project.project_code.toLowerCase().includes(searchLower) ||
        project.project_name.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter

      // Department filter
      const matchesDepartment = departmentFilter === 'all' || project.department_id === departmentFilter

      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [enrichedProjects, searchQuery, statusFilter, departmentFilter])

  // Column definitions
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'project_code',
      header: 'Project Code',
      cell: ({ row }) => <div className="font-medium">{row.original.project_code}</div>,
    },
    {
      accessorKey: 'project_name',
      header: 'Project Name',
      cell: ({ row }) => <div className="max-w-md truncate">{row.original.project_name}</div>,
    },
    {
      accessorKey: 'departments',
      header: 'Department',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{row.original.departments?.name || '-'}</div>
      ),
    },
    {
      accessorKey: 'expert_tier',
      header: 'Tier',
      cell: ({ row }) => {
        const tier = row.original.expert_tier
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
          tier0: 'outline',
          tier1: 'secondary',
          tier2: 'default',
        }
        return <Badge variant={variants[tier] || 'outline'}>{tier.toUpperCase()}</Badge>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          active: 'default',
          paused: 'secondary',
          completed: 'outline',
          cancelled: 'destructive',
        }
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
      },
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => {
        const date = row.original.start_date
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
              navigate(`/projects/${row.original.id}/edit`)
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
    data: filteredProjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDepartmentFilter('all')
  }

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
          <AlertDescription>Failed to load projects: {error?.message || 'Unknown error'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage workforce projects ({projects?.length || 0} total)</p>
        </div>
        <Button onClick={() => navigate('/projects/create')}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search */}
        <div className="flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Input
              id="search"
              placeholder="Search by project code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <Label htmlFor="status">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div className="w-full md:w-48">
          <Label htmlFor="department">Department</Label>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger id="department">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.department_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'all' || departmentFilter !== 'all') && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredProjects.length} of {projects?.length || 0} projects
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate(`/projects/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No projects found.
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
