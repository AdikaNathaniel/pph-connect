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
  VisibilityState,
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
import { X, Filter as FilterIcon, Download, Upload, Settings2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterBar } from '@/components/features/filters/FilterBar'
import type { FilterField, FilterValue, DateRange } from '@/types/filters'
import { BulkUploadDialog } from '@/components/features/workers/BulkUploadDialog'
import { BulkStatusUpdateDialog } from '@/components/features/workers/BulkStatusUpdateDialog'
import { BulkAssignToProjectDialog } from '@/components/features/workers/BulkAssignToProjectDialog'
import { BulkDeleteDialog } from '@/components/features/workers/BulkDeleteDialog'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  email_pph: string | null
  status: 'pending' | 'active' | 'inactive' | 'terminated'
  engagement_model: 'core' | 'upwork' | 'external' | 'internal'
  worker_role: string | null
  hire_date: string
  rtw_datetime: string | null
  bgc_expiration_date: string | null
  termination_date: string | null
  supervisor_id: string | null
  country_residence: string
  locale_primary: string
}

export function WorkerList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('pph-worker-column-visibility')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // Invalid JSON, use defaults
      }
    }
    // Default: hide some columns to keep table manageable
    return {
      email_pph: false,
      worker_role: false,
      locale_primary: false,
      rtw_datetime: false,
      termination_date: false,
    }
  })

  // Persist column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('pph-worker-column-visibility', JSON.stringify(columnVisibility))
  }, [columnVisibility])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')

  // Advanced filtering state
  const [advancedFilters, setAdvancedFilters] = useState<FilterValue[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Bulk upload state - initialize from query param if present
  const [showBulkUpload, setShowBulkUpload] = useState(
    () => searchParams.get('action') === 'bulk-upload'
  )

  // Row selection state
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showBulkStatusUpdate, setShowBulkStatusUpdate] = useState(false)
  const [showBulkAssignToProject, setShowBulkAssignToProject] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  // Fetch workers data
  const { data: workers, isLoading, isError, error } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('workers')
        .select(`
          id,
          hr_id,
          full_name,
          email_personal,
          email_pph,
          status,
          engagement_model,
          worker_role,
          hire_date,
          rtw_datetime,
          bgc_expiration_date,
          termination_date,
          supervisor_id,
          country_residence,
          locale_primary
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Worker[]
    },
  })

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    setSearchParams(params, { replace: true })
  }, [searchQuery, statusFilter, setSearchParams])

  // Define filter fields configuration
  const filterFields: FilterField[] = useMemo(() => {
    if (!workers) return []

    const statusOptions = Array.from(new Set(workers.map(w => w.status))).map(status => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    }))

    const countryOptions = Array.from(new Set(workers.map(w => w.country_residence))).map(country => ({
      value: country,
      label: country
    }))

    return [
      {
        key: 'hr_id',
        label: 'HR ID',
        type: 'text' as const,
        options: workers.map(w => ({ value: w.hr_id, label: w.hr_id }))
      },
      {
        key: 'full_name',
        label: 'Name',
        type: 'text' as const,
        options: workers.map(w => ({ value: w.full_name, label: w.full_name }))
      },
      {
        key: 'status',
        label: 'Status',
        type: 'categorical' as const,
        options: statusOptions
      },
      {
        key: 'country_residence',
        label: 'Country',
        type: 'categorical' as const,
        options: countryOptions
      },
      {
        key: 'hire_date',
        label: 'Hire Date',
        type: 'date' as const
      },
      {
        key: 'bgc_expiration_date',
        label: 'BGC Expiration',
        type: 'date' as const
      }
    ]
  }, [workers])

  // Export CSV handler
  const handleExportCSV = () => {
    if (finalFilteredWorkers.length === 0) return

    const csv = [
      ['HR ID', 'Full Name', 'Email', 'PPH Email', 'Status', 'Engagement Model', 'Role', 'Hire Date', 'RTW Date', 'BGC Expiration', 'Termination Date', 'Country', 'Primary Locale'].join(','),
      ...finalFilteredWorkers.map(w => [
        w.hr_id,
        `"${w.full_name}"`,
        w.email_personal,
        w.email_pph || '',
        w.status,
        w.engagement_model,
        `"${w.worker_role || ''}"`,
        w.hire_date,
        w.rtw_datetime || '',
        w.bgc_expiration_date || '',
        w.termination_date || '',
        w.country_residence,
        w.locale_primary
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Export selected workers
  const handleExportSelected = () => {
    const selectedWorkers = table.getSelectedRowModel().rows.map(row => row.original)
    if (selectedWorkers.length === 0) return

    const csv = [
      ['HR ID', 'Full Name', 'Email', 'PPH Email', 'Status', 'Engagement Model', 'Role', 'Hire Date', 'RTW Date', 'BGC Expiration', 'Termination Date', 'Country', 'Primary Locale'].join(','),
      ...selectedWorkers.map(w => [
        w.hr_id,
        `"${w.full_name}"`,
        w.email_personal,
        w.email_pph || '',
        w.status,
        w.engagement_model,
        `"${w.worker_role || ''}"`,
        w.hire_date,
        w.rtw_datetime || '',
        w.bgc_expiration_date || '',
        w.termination_date || '',
        w.country_residence,
        w.locale_primary
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workers-selected-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Debounced search and filtering
  const filteredWorkers = useMemo(() => {
    if (!workers) return []

    return workers.filter((worker) => {
      // Search filter (name or email)
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        worker.full_name.toLowerCase().includes(searchLower) ||
        worker.email_personal.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = statusFilter === 'all' || worker.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [workers, searchQuery, statusFilter])

  // Apply advanced filters
  const finalFilteredWorkers = useMemo(() => {
    if (advancedFilters.length === 0) {
      return filteredWorkers
    }

    return filteredWorkers.filter((worker) => {
      return advancedFilters.every((filter) => {
        const fieldValue = worker[filter.field as keyof Worker]

        if (filter.operator === 'in') {
          return (filter.values as string[]).includes(String(fieldValue))
        }

        if (filter.operator === 'not_in') {
          return !(filter.values as string[]).includes(String(fieldValue))
        }

        if (filter.operator === 'between' && fieldValue) {
          const dateRange = filter.values as DateRange
          const workerDate = new Date(String(fieldValue))
          return workerDate >= dateRange.start && workerDate <= dateRange.end
        }

        if (filter.operator === 'before' && fieldValue) {
          const dateRange = filter.values as DateRange
          const workerDate = new Date(String(fieldValue))
          return workerDate < dateRange.start
        }

        if (filter.operator === 'after' && fieldValue) {
          const dateRange = filter.values as DateRange
          const workerDate = new Date(String(fieldValue))
          return workerDate > dateRange.start
        }

        if (filter.operator === 'equal' && fieldValue) {
          const dateRange = filter.values as DateRange
          const workerDate = new Date(String(fieldValue))
          workerDate.setHours(0, 0, 0, 0)
          const filterDate = new Date(dateRange.start)
          filterDate.setHours(0, 0, 0, 0)
          return workerDate.getTime() === filterDate.getTime()
        }

        return true
      })
    })
  }, [filteredWorkers, advancedFilters])

  // Column definitions
  const columns: ColumnDef<Worker>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'hr_id',
      header: 'HR ID',
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.original.hr_id}
        </div>
      ),
    },
    {
      accessorKey: 'full_name',
      header: 'Full Name',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.full_name}
        </div>
      ),
    },
    {
      accessorKey: 'email_personal',
      header: 'Email',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.email_personal}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          active: 'default',
          pending: 'secondary',
          inactive: 'outline',
          terminated: 'destructive',
        }
        return (
          <Badge variant={variants[status] || 'secondary'}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'bgc_expiration_date',
      header: 'BGC Expiration',
      cell: ({ row }) => {
        const date = row.original.bgc_expiration_date
        if (!date) return <span className="text-muted-foreground">-</span>

        const expirationDate = new Date(date)
        const today = new Date()
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        const isExpired = daysUntilExpiration < 0
        const isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration < 30

        return (
          <div className="flex items-center gap-2">
            {isExpired && (
              <span className="text-destructive text-xs">⚠️ Expired</span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="text-yellow-600 text-xs">⚠️ Expiring Soon</span>
            )}
            {!isExpired && !isExpiringSoon && (
              <span className="text-green-600 text-xs">✓</span>
            )}
            <span className="text-sm">{format(expirationDate, 'MMM d, yyyy')}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'hire_date',
      header: 'Hire Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.hire_date), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      accessorKey: 'email_pph',
      header: 'PPH Email',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.email_pph || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'engagement_model',
      header: 'Engagement Model',
      cell: ({ row }) => {
        const model = row.original.engagement_model
        return (
          <Badge variant="outline" className="capitalize">
            {model}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'worker_role',
      header: 'Role',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.worker_role || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'country_residence',
      header: 'Country',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.country_residence}
        </div>
      ),
    },
    {
      accessorKey: 'locale_primary',
      header: 'Primary Locale',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.locale_primary}
        </div>
      ),
    },
    {
      accessorKey: 'rtw_datetime',
      header: 'RTW Date',
      cell: ({ row }) => {
        const date = row.original.rtw_datetime
        if (!date) return <span className="text-muted-foreground">-</span>
        return (
          <div className="text-sm">
            {format(new Date(date), 'MMM d, yyyy')}
          </div>
        )
      },
    },
    {
      accessorKey: 'termination_date',
      header: 'Termination Date',
      cell: ({ row }) => {
        const date = row.original.termination_date
        if (!date) return <span className="text-muted-foreground">-</span>
        return (
          <div className="text-sm text-destructive">
            {format(new Date(date), 'MMM d, yyyy')}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/workers/${row.original.id}/edit`)
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
    data: finalFilteredWorkers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load workers: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your workforce ({workers?.length || 0} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Advanced Filters
            {advancedFilters.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {advancedFilters.length}
              </span>
            )}
          </Button>
          {finalFilteredWorkers.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => navigate('/workers/create')}>
            Create Worker
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {Object.keys(rowSelection).length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulkStatusUpdate(true)}>
              Change Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkAssignToProject(true)}>
              Assign to Project
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)}>
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-medium mb-3">Advanced Filters</h3>
          <FilterBar
            fields={filterFields}
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search */}
        <div className="flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Input
              id="search"
              placeholder="Search by name or email..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'all') && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {finalFilteredWorkers.length} of {workers?.length || 0} workers
        {advancedFilters.length > 0 && (
          <span className="text-primary"> (advanced filters active)</span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table style={{ width: table.getTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      position: 'relative',
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent hover:bg-primary ${
                          header.column.getIsResizing() ? 'bg-primary' : ''
                        }`}
                      />
                    )}
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
                  onClick={() => navigate(`/workers/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No workers found.
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog open={showBulkUpload} onOpenChange={setShowBulkUpload} />

      {/* Bulk Status Update Dialog */}
      <BulkStatusUpdateDialog
        open={showBulkStatusUpdate}
        onOpenChange={setShowBulkStatusUpdate}
        workers={table.getSelectedRowModel().rows.map(row => row.original)}
        onSuccess={() => setRowSelection({})}
      />

      {/* Bulk Assign to Project Dialog */}
      <BulkAssignToProjectDialog
        open={showBulkAssignToProject}
        onOpenChange={setShowBulkAssignToProject}
        workers={table.getSelectedRowModel().rows.map(row => row.original)}
        onSuccess={() => setRowSelection({})}
      />

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        workers={table.getSelectedRowModel().rows.map(row => row.original)}
        onSuccess={() => setRowSelection({})}
      />
    </div>
  )
}
