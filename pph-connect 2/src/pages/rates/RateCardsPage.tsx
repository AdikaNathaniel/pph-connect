import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Globe,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

type RatePayable = {
  id: string
  locale: string
  expert_tier: string
  country: string
  rate_per_unit: number | null
  rate_per_hour: number | null
  currency: string
  effective_from: string
  effective_to: string | null
  created_at: string
  created_by: string | null
}

type RateFormData = {
  locale: string
  expert_tier: string
  country: string
  rate_per_unit: string
  rate_per_hour: string
  currency: string
  effective_from: string
  effective_to: string
}

const EXPERT_TIERS = ['tier0', 'tier1', 'tier2']
const TIER_LABELS: Record<string, string> = {
  tier0: 'Tier 0 (Entry)',
  tier1: 'Tier 1 (Intermediate)',
  tier2: 'Tier 2 (Expert)',
}
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PHP', 'INR', 'MXN']

export default function RateCardsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRate, setSelectedRate] = useState<RatePayable | null>(null)
  const [formData, setFormData] = useState<RateFormData>({
    locale: '',
    expert_tier: 'tier0',
    country: '',
    rate_per_unit: '',
    rate_per_hour: '',
    currency: 'USD',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  })

  // Fetch user profile to check role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }
      return data
    },
    enabled: !!user?.id,
  })

  // Fetch rates
  const { data: rates, isLoading } = useQuery({
    queryKey: ['rates-payable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rates_payable')
        .select('*')
        .order('locale', { ascending: true })
        .order('expert_tier', { ascending: true })
        .order('effective_from', { ascending: false })

      if (error) throw error
      return data as RatePayable[]
    },
  })

  // Add rate mutation
  const addMutation = useMutation({
    mutationFn: async (data: RateFormData) => {
      const { data: insertedData, error } = await supabase.from('rates_payable').insert({
        locale: data.locale,
        expert_tier: data.expert_tier,
        country: data.country,
        rate_per_unit: data.rate_per_unit ? parseFloat(data.rate_per_unit) : null,
        rate_per_hour: data.rate_per_hour ? parseFloat(data.rate_per_hour) : null,
        currency: data.currency,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        created_by: null, // Set to null - auth user ID doesn't match workers table
      }).select()

      if (error) throw error

      // Check if the insert actually succeeded
      if (!insertedData || insertedData.length === 0) {
        throw new Error('Insert failed: No rows were created. You may not have permission to add rates.')
      }

      return insertedData[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates-payable'] })
      setIsAddDialogOpen(false)
      resetForm()
      toast.success('Rate Added', {
        description: 'The rate card has been created successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message,
      })
    },
  })

  // Edit rate mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RateFormData }) => {
      const { data: updatedData, error } = await supabase
        .from('rates_payable')
        .update({
          locale: data.locale,
          expert_tier: data.expert_tier,
          country: data.country,
          rate_per_unit: data.rate_per_unit ? parseFloat(data.rate_per_unit) : null,
          rate_per_hour: data.rate_per_hour ? parseFloat(data.rate_per_hour) : null,
          currency: data.currency,
          effective_from: data.effective_from,
          effective_to: data.effective_to || null,
        })
        .eq('id', id)
        .select()

      if (error) throw error

      // Check if the update actually affected any rows
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Update failed: No rows were updated. You may not have permission to update this rate.')
      }

      return updatedData[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates-payable'] })
      setIsEditDialogOpen(false)
      setSelectedRate(null)
      resetForm()
      toast.success('Rate Updated', {
        description: 'The rate card has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message,
      })
    },
  })

  // Deactivate rate mutation (set effective_to to today)
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: updatedData, error } = await supabase
        .from('rates_payable')
        .update({
          effective_to: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()

      if (error) throw error

      // Check if the update actually affected any rows
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Deactivation failed: No rows were updated. You may not have permission to update this rate.')
      }

      return updatedData[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates-payable'] })
      setIsDeleteDialogOpen(false)
      setSelectedRate(null)
      toast.success('Rate Deactivated', {
        description: 'The rate card has been deactivated.',
      })
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message,
      })
    },
  })

  const resetForm = () => {
    setFormData({
      locale: '',
      expert_tier: 'tier0',
      country: '',
      rate_per_unit: '',
      rate_per_hour: '',
      currency: 'USD',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
    })
  }

  const handleEdit = (rate: RatePayable) => {
    setSelectedRate(rate)
    setFormData({
      locale: rate.locale,
      expert_tier: rate.expert_tier,
      country: rate.country,
      rate_per_unit: rate.rate_per_unit?.toString() || '',
      rate_per_hour: rate.rate_per_hour?.toString() || '',
      currency: rate.currency,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleDeactivate = (rate: RatePayable) => {
    setSelectedRate(rate)
    setIsDeleteDialogOpen(true)
  }

  // Validate date range: effective_to must be after effective_from (or empty)
  const isDateRangeValid = (from: string, to: string): boolean => {
    if (!to) return true // Empty effective_to is valid (indefinite)
    return new Date(to) > new Date(from)
  }

  // Validate form and return array of missing fields
  const validateForm = (): string[] => {
    const missingFields: string[] = []
    if (!formData.locale) missingFields.push('Locale')
    if (!formData.expert_tier) missingFields.push('Expert Tier')
    if (!formData.country) missingFields.push('Country')
    if (!formData.currency) missingFields.push('Currency')
    if (!formData.effective_from) missingFields.push('Effective From')
    return missingFields
  }

  const handleAddRate = () => {
    // Check required fields first
    const missingFields = validateForm()
    if (missingFields.length > 0) {
      toast.error('Missing Required Fields', {
        description: `Please fill in: ${missingFields.join(', ')}`,
      })
      return
    }

    // Check date range
    if (formData.effective_to && !isDateRangeValid(formData.effective_from, formData.effective_to)) {
      toast.error('Invalid Date Range', {
        description: 'Effective To date must be after Effective From date.',
      })
      return
    }
    addMutation.mutate(formData)
  }

  const handleEditRate = () => {
    if (!selectedRate) return

    // Check required fields first
    const missingFields = validateForm()
    if (missingFields.length > 0) {
      toast.error('Missing Required Fields', {
        description: `Please fill in: ${missingFields.join(', ')}`,
      })
      return
    }

    // Check date range
    if (formData.effective_to && !isDateRangeValid(formData.effective_from, formData.effective_to)) {
      toast.error('Invalid Date Range', {
        description: 'Effective To date must be after Effective From date.',
      })
      return
    }
    editMutation.mutate({ id: selectedRate.id, data: formData })
  }

  const isRateActive = (rate: RatePayable) => {
    if (!rate.effective_to) return true
    return new Date(rate.effective_to) >= new Date()
  }

  // Check if user can manage rates (root, admin, or manager)
  const canManageRates = useMemo(() => {
    if (!userProfile) return false
    return ['root', 'admin', 'manager'].includes(userProfile.role)
  }, [userProfile])

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!rates) return { total: 0, active: 0, locales: 0, tiers: 0 }

    const activeRates = rates.filter(isRateActive)
    const uniqueLocales = new Set(rates.map(r => r.locale)).size
    const uniqueTiers = new Set(rates.map(r => r.expert_tier)).size

    return {
      total: rates.length,
      active: activeRates.length,
      locales: uniqueLocales,
      tiers: uniqueTiers,
    }
  }, [rates])

  // Table columns
  const columns: ColumnDef<RatePayable>[] = useMemo(
    () => [
      {
        accessorKey: 'locale',
        header: () => <span className="whitespace-nowrap">Locale</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{row.original.locale}</span>
          </div>
        ),
      },
      {
        accessorKey: 'expert_tier',
        header: () => <span className="whitespace-nowrap">Expert Tier</span>,
        cell: ({ row }) => {
          const tier = row.original.expert_tier
          const tierColors: Record<string, string> = {
            tier0: 'bg-slate-100 text-slate-800',
            tier1: 'bg-blue-100 text-blue-800',
            tier2: 'bg-purple-100 text-purple-800',
          }
          const tierLabels: Record<string, string> = {
            tier0: 'Tier 0',
            tier1: 'Tier 1',
            tier2: 'Tier 2',
          }
          return (
            <Badge variant="secondary" className={`whitespace-nowrap ${tierColors[tier] || ''}`}>
              {tierLabels[tier] || tier}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'country',
        header: () => <span className="whitespace-nowrap">Country</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.country || '-'}</span>,
      },
      {
        accessorKey: 'rate_per_unit',
        header: () => <span className="whitespace-nowrap">Rate/Unit</span>,
        cell: ({ row }) => {
          const rate = row.original.rate_per_unit
          const currency = row.original.currency
          return <span className="whitespace-nowrap">{rate ? `${currency} ${rate.toFixed(2)}` : '-'}</span>
        },
      },
      {
        accessorKey: 'rate_per_hour',
        header: () => <span className="whitespace-nowrap">Rate/Hour</span>,
        cell: ({ row }) => {
          const rate = row.original.rate_per_hour
          const currency = row.original.currency
          return <span className="whitespace-nowrap">{rate ? `${currency} ${rate.toFixed(2)}` : '-'}</span>
        },
      },
      {
        accessorKey: 'currency',
        header: () => <span className="whitespace-nowrap">Currency</span>,
        cell: ({ row }) => (
          <Badge variant="outline" className="whitespace-nowrap">{row.original.currency}</Badge>
        ),
      },
      {
        accessorKey: 'effective_from',
        header: () => <span className="whitespace-nowrap">Effective From</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{format(new Date(row.original.effective_from), 'MMM d, yyyy')}</span>,
      },
      {
        accessorKey: 'effective_to',
        header: () => <span className="whitespace-nowrap">Effective To</span>,
        cell: ({ row }) => {
          const date = row.original.effective_to
          if (!date) return <Badge variant="secondary" className="whitespace-nowrap">Active</Badge>
          const isExpired = new Date(date) < new Date()
          return (
            <span className={`whitespace-nowrap ${isExpired ? 'text-muted-foreground' : ''}`}>
              {format(new Date(date), 'MMM d, yyyy')}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        cell: ({ row }) => {
          const active = isRateActive(row.original)
          return (
            <Badge variant={active ? 'default' : 'secondary'} className="whitespace-nowrap">
              {active ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!canManageRates}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row.original)} disabled={!canManageRates}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isRateActive(row.original) && (
                <DropdownMenuItem
                  onClick={() => handleDeactivate(row.original)}
                  className="text-destructive"
                  disabled={!canManageRates}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canManageRates]
  )

  const table = useReactTable({
    data: rates || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rate Cards</h1>
          <p className="text-muted-foreground">
            Manage payable rates by locale, expert tier, and country
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={!canManageRates}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {/* Permission Warning */}
      {userProfile && !canManageRates && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limited Access</AlertTitle>
          <AlertDescription>
            Your current role ({userProfile.role}) does not have permission to add, edit, or deactivate rate cards.
            Contact an administrator to request the 'admin' or 'manager' role.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rates</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rates</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locales</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.locales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expert Tiers</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.tiers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rate Cards</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rates..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap">
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No rates found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} rates
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Rate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Rate</DialogTitle>
            <DialogDescription>
              Create a new rate card for a specific locale and expert tier.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="locale">Locale *</Label>
              <Input
                id="locale"
                placeholder="e.g., en-US, es-MX, fr-FR"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expert_tier">Expert Tier *</Label>
              <Select
                value={formData.expert_tier}
                onValueChange={(value) => setFormData({ ...formData, expert_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERT_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABELS[tier] || tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="e.g., US, MX, PH"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate_per_unit">Rate per Unit</Label>
                <Input
                  id="rate_per_unit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate_per_hour">Rate per Hour</Label>
                <Input
                  id="rate_per_hour"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.rate_per_hour}
                  onChange={(e) => setFormData({ ...formData, rate_per_hour: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effective_to">Effective To</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRate}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding...' : 'Add Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rate</DialogTitle>
            <DialogDescription>
              Update the rate card details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-locale">Locale *</Label>
              <Input
                id="edit-locale"
                placeholder="e.g., en-US, es-MX, fr-FR"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-expert_tier">Expert Tier *</Label>
              <Select
                value={formData.expert_tier}
                onValueChange={(value) => setFormData({ ...formData, expert_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERT_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABELS[tier] || tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-country">Country *</Label>
              <Input
                id="edit-country"
                placeholder="e.g., US, MX, PH"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-rate_per_unit">Rate per Unit</Label>
                <Input
                  id="edit-rate_per_unit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rate_per_hour">Rate per Hour</Label>
                <Input
                  id="edit-rate_per_hour"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.rate_per_hour}
                  onChange={(e) => setFormData({ ...formData, rate_per_hour: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-effective_from">Effective From *</Label>
                <Input
                  id="edit-effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-effective_to">Effective To</Label>
                <Input
                  id="edit-effective_to"
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRate}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this rate card? This will set the effective end date to today. The rate will no longer be used for new calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRate && deactivateMutation.mutate(selectedRate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
