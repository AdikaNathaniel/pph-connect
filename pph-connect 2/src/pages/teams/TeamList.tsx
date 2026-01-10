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
import { useAuth } from '@/contexts/AuthContext'
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
import { X, Users } from 'lucide-react'

type Team = {
  id: string
  team_name: string
  department_id: string
  locale_primary: string
  locale_secondary: string | null
  locale_region: string | null
  is_active: boolean
  created_at: string
  departments?: {
    name: string
  }
  workers_count?: number
}

export function TeamList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isManagerOrAbove } = useAuth()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('department') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('active') || 'all')

  // Fetch teams data
  const { data: teams, isLoading, isError, error } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Team[]
    },
  })

  // Fetch departments separately
  const { data: departmentMap } = useQuery({
    queryKey: ['departments-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, department_name')

      if (error) throw error

      const map = new Map()
      data?.forEach((dept: any) => map.set(dept.id, dept.department_name))
      return map
    },
  })

  // Note: teams table does not have leader_id column - team leaders would be tracked via team_members with a role field
  // For now, worker counts are not available since workers don't have direct team_id

  // Fetch departments for filter
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, department_name').order('department_name')

      if (error) throw error
      return data
    },
  })

  // Enrich teams with department names
  const enrichedTeams = useMemo(() => {
    if (!teams) return []

    return teams.map((team: any) => ({
      ...team,
      departments: team.department_id ? { name: departmentMap?.get(team.department_id) || 'Unknown' } : undefined,
      workers_count: 0, // Workers are not directly linked to teams - would need team_members table
    }))
  }, [teams, departmentMap])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (departmentFilter !== 'all') params.set('department', departmentFilter)
    if (activeFilter !== 'all') params.set('active', activeFilter)
    setSearchParams(params, { replace: true })
  }, [searchQuery, departmentFilter, activeFilter, setSearchParams])

  // Filtered teams
  const filteredTeams = useMemo(() => {
    if (!enrichedTeams) return []

    return enrichedTeams.filter((team) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || team.team_name.toLowerCase().includes(searchLower)

      // Department filter
      const matchesDepartment = departmentFilter === 'all' || team.department_id === departmentFilter

      // Active filter
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && team.is_active) ||
        (activeFilter === 'inactive' && !team.is_active)

      return matchesSearch && matchesDepartment && matchesActive
    })
  }, [enrichedTeams, searchQuery, departmentFilter, activeFilter])

  // Column definitions
  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: 'team_name',
      header: 'Team Name',
      cell: ({ row }) => <div className="font-medium">{row.original.team_name}</div>,
    },
    {
      accessorKey: 'departments',
      header: 'Department',
      cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.departments?.name || '-'}</div>,
    },
    {
      accessorKey: 'locale_primary',
      header: 'Primary Locale',
      cell: ({ row }) => <Badge variant="outline">{row.original.locale_primary}</Badge>,
    },
    {
      accessorKey: 'locale_secondary',
      header: 'Secondary Locale',
      cell: ({ row }) => {
        const locale = row.original.locale_secondary
        return locale ? <Badge variant="secondary">{locale}</Badge> : <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
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
              navigate(`/teams/${row.original.id}/edit`)
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
    data: filteredTeams,
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
    setDepartmentFilter('all')
    setActiveFilter('all')
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
          <AlertDescription>Failed to load teams: {error?.message || 'Unknown error'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage language-based teams ({teams?.length || 0} total)</p>
        </div>
        {isManagerOrAbove && (
          <Button onClick={() => navigate('/teams/create')}>
            <Users className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search */}
        <div className="flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Input
              id="search"
              placeholder="Search by team name..."
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

        {/* Active Filter */}
        <div className="w-full md:w-48">
          <Label htmlFor="active">Status</Label>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger id="active">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || departmentFilter !== 'all' || activeFilter !== 'all') && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredTeams.length} of {teams?.length || 0} teams
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
                <TableRow
                  key={row.id}
                  onClick={() => navigate(`/teams/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No teams found.
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
