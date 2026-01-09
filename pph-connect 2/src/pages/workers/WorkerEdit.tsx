import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { workerSchema, type WorkerFormData } from '@/lib/schemas/worker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

const ENGAGEMENT_MODELS = [
  { value: 'core', label: 'Core' },
  { value: 'upwork', label: 'Upwork' },
  { value: 'external', label: 'External' },
  { value: 'internal', label: 'Internal' },
]

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
]

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'PH', label: 'Philippines' },
  { value: 'IN', label: 'India' },
  { value: 'MX', label: 'Mexico' },
  { value: 'BR', label: 'Brazil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colombia' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'ES', label: 'Spain' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'PL', label: 'Poland' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'KE', label: 'Kenya' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'OTHER', label: 'Other' },
]

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

export function WorkerEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)

  // Fetch existing worker data FIRST
  const { data: worker, isLoading: workerLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Format rtw_datetime for datetime-local input (YYYY-MM-DDTHH:MM)
  const getFormattedRtwDatetime = (rtw: string | null) => {
    if (!rtw) return ''
    const date = new Date(rtw)
    return date.toISOString().slice(0, 16)
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    // Initialize with worker data when available
    values: worker ? {
      hr_id: worker.hr_id,
      full_name: worker.full_name,
      engagement_model: worker.engagement_model,
      worker_role: worker.worker_role || '',
      email_personal: worker.email_personal,
      email_pph: worker.email_pph || '',
      country_residence: worker.country_residence,
      locale_primary: worker.locale_primary,
      locale_all: worker.locale_all || [],
      hire_date: worker.hire_date,
      rtw_datetime: getFormattedRtwDatetime(worker.rtw_datetime),
      supervisor_id: worker.supervisor_id || '',
      termination_date: worker.termination_date || '',
      bgc_expiration_date: worker.bgc_expiration_date || '',
      status: worker.status,
    } : undefined,
  })

  // Fetch potential supervisors
  const { data: supervisors } = useQuery({
    queryKey: ['supervisors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name')
        .eq('status', 'active')
        .neq('id', id || '') // Exclude self
        .order('full_name')

      if (error) throw error
      return data
    },
  })


  // Update worker mutation
  const updateMutation = useMutation({
    mutationFn: async (data: WorkerFormData) => {
      if (!user) throw new Error('User not authenticated')

      // Build update payload
      // Database constraint: workers_status_requirements_check
      // - pending: rtw_datetime = NULL, termination_date = NULL
      // - active/inactive: rtw_datetime SET, termination_date = NULL
      // - terminated: rtw_datetime AND termination_date both SET
      const basePayload = {
        hr_id: data.hr_id,
        full_name: data.full_name,
        engagement_model: data.engagement_model,
        worker_role: data.worker_role || null,
        email_personal: data.email_personal,
        email_pph: data.email_pph || null,
        country_residence: data.country_residence,
        locale_primary: data.locale_primary,
        locale_all: data.locale_all || [],
        hire_date: data.hire_date,
        supervisor_id: data.supervisor_id || null,
        bgc_expiration_date: data.bgc_expiration_date || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }

      let updatePayload: Record<string, unknown> = { ...basePayload }

      // Handle status-specific field requirements
      if (data.status === 'pending') {
        // Pending requires rtw_datetime = NULL, termination_date = NULL
        updatePayload.status = 'pending'
        updatePayload.rtw_datetime = null
        updatePayload.termination_date = null
      } else if (data.status === 'active' || data.status === 'inactive') {
        // Active/inactive requires rtw_datetime SET, termination_date = NULL
        updatePayload.status = data.status
        updatePayload.rtw_datetime = data.rtw_datetime || new Date().toISOString()
        updatePayload.termination_date = null
      } else if (data.status === 'terminated') {
        // Terminated requires both rtw_datetime AND termination_date SET
        updatePayload.status = 'terminated'
        updatePayload.rtw_datetime = data.rtw_datetime || new Date().toISOString()
        updatePayload.termination_date = data.termination_date || new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('workers')
        .update(updatePayload)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      queryClient.invalidateQueries({ queryKey: ['worker', id] })
      navigate('/workers')
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const onSubmit = (data: WorkerFormData) => {
    setError(null)
    updateMutation.mutate(data)
  }

  // Don't render the form until worker data is loaded
  if (workerLoading || !worker) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/workers')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workers
        </Button>
        <h1 className="text-3xl font-bold">Edit Worker</h1>
        <p className="text-muted-foreground mt-1">
          Update worker information
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Same card structure as WorkerCreate - abbreviated for space */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hr_id">HR ID *</Label>
              <Input id="hr_id" {...register('hr_id')} />
              {errors.hr_id && <p className="text-sm text-destructive">{errors.hr_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_personal">Personal Email *</Label>
              <Input id="email_personal" type="email" {...register('email_personal')} />
              {errors.email_personal && <p className="text-sm text-destructive">{errors.email_personal.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_pph">PPH Email</Label>
              <Input id="email_pph" type="email" {...register('email_pph')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Engagement Model *</Label>
              <Select
                value={watch('engagement_model') || ''}
                onValueChange={(value) => setValue('engagement_model', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select engagement model" />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker_role">Worker Role</Label>
              <Input id="worker_role" {...register('worker_role')} />
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={watch('status') || ''}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select
                value={watch('supervisor_id') || 'none'}
                onValueChange={(value) => setValue('supervisor_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Supervisor</SelectItem>
                  {supervisors?.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location & Locale</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country of Residence *</Label>
              <Select
                value={watch('country_residence')?.toUpperCase() || ''}
                onValueChange={(value) => setValue('country_residence', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {watch('country_residence') && !COUNTRIES.find(c => c.value === watch('country_residence')?.toUpperCase()) && (
                <p className="text-sm text-muted-foreground">
                  Current value: {watch('country_residence')} (not in list)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Primary Locale *</Label>
              <Select
                value={watch('locale_primary') || ''}
                onValueChange={(value) => setValue('locale_primary', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((locale) => (
                    <SelectItem key={locale.value} value={locale.value}>
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date *</Label>
              <Input id="hire_date" type="date" {...register('hire_date')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rtw_datetime">RTW Date/Time</Label>
              <Input id="rtw_datetime" type="datetime-local" {...register('rtw_datetime')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bgc_expiration_date">BGC Expiration Date</Label>
              <Input id="bgc_expiration_date" type="date" {...register('bgc_expiration_date')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termination_date">Termination Date</Label>
              <Input id="termination_date" type="date" {...register('termination_date')} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Updating...' : 'Update Worker'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/workers')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
