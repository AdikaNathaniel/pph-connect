import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function WorkerCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      status: 'pending',
      engagement_model: 'core',
      locale_all: [],
    },
  })

  // Fetch potential supervisors (active workers)
  const { data: supervisors } = useQuery({
    queryKey: ['supervisors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      return data
    },
  })

  // Create worker mutation
  const createMutation = useMutation({
    mutationFn: async (data: WorkerFormData) => {
      if (!user) throw new Error('User not authenticated')

      // Build insert payload
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
        created_by: user.id,
        updated_by: user.id,
      }

      let insertPayload: Record<string, unknown> = { ...basePayload }

      // Handle status-specific field requirements
      if (data.status === 'pending') {
        // Pending requires rtw_datetime = NULL, termination_date = NULL
        insertPayload.status = 'pending'
        insertPayload.rtw_datetime = null
        insertPayload.termination_date = null
      } else if (data.status === 'active' || data.status === 'inactive') {
        // Active/inactive requires rtw_datetime SET, termination_date = NULL
        insertPayload.status = data.status
        insertPayload.rtw_datetime = data.rtw_datetime || new Date().toISOString()
        insertPayload.termination_date = null
      } else if (data.status === 'terminated') {
        // Terminated requires both rtw_datetime AND termination_date SET
        insertPayload.status = 'terminated'
        insertPayload.rtw_datetime = data.rtw_datetime || new Date().toISOString()
        insertPayload.termination_date = data.termination_date || new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase.from('workers').insert(insertPayload)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      navigate('/workers')
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const onSubmit = (data: WorkerFormData) => {
    setError(null)
    createMutation.mutate(data)
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
        <h1 className="text-3xl font-bold">Create Worker</h1>
        <p className="text-muted-foreground mt-1">
          Add a new worker to the system
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core worker identity and contact details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HR ID */}
            <div className="space-y-2">
              <Label htmlFor="hr_id">HR ID *</Label>
              <Input
                id="hr_id"
                {...register('hr_id')}
                placeholder="e.g., EMP001"
              />
              {errors.hr_id && (
                <p className="text-sm text-destructive">{errors.hr_id.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            {/* Personal Email */}
            <div className="space-y-2">
              <Label htmlFor="email_personal">Personal Email *</Label>
              <Input
                id="email_personal"
                type="email"
                {...register('email_personal')}
                placeholder="john@example.com"
              />
              {errors.email_personal && (
                <p className="text-sm text-destructive">{errors.email_personal.message}</p>
              )}
            </div>

            {/* PPH Email */}
            <div className="space-y-2">
              <Label htmlFor="email_pph">PPH Email</Label>
              <Input
                id="email_pph"
                type="email"
                {...register('email_pph')}
                placeholder="john@pph.com"
              />
              {errors.email_pph && (
                <p className="text-sm text-destructive">{errors.email_pph.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Engagement model and work information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engagement Model */}
            <div className="space-y-2">
              <Label htmlFor="engagement_model">Engagement Model *</Label>
              <Select
                value={watch('engagement_model')}
                onValueChange={(value) => setValue('engagement_model', value as any)}
              >
                <SelectTrigger id="engagement_model">
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
              {errors.engagement_model && (
                <p className="text-sm text-destructive">{errors.engagement_model.message}</p>
              )}
            </div>

            {/* Worker Role */}
            <div className="space-y-2">
              <Label htmlFor="worker_role">Worker Role</Label>
              <Input
                id="worker_role"
                {...register('worker_role')}
                placeholder="e.g., Annotator, QA Specialist"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger id="status">
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

            {/* Supervisor */}
            <div className="space-y-2">
              <Label htmlFor="supervisor_id">Supervisor</Label>
              <Select
                value={watch('supervisor_id') || 'none'}
                onValueChange={(value) => setValue('supervisor_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger id="supervisor_id">
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
            <CardDescription>Geographic and language information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country_residence">Country of Residence *</Label>
              <Select
                value={watch('country_residence')}
                onValueChange={(value) => setValue('country_residence', value)}
              >
                <SelectTrigger id="country_residence">
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
              {errors.country_residence && (
                <p className="text-sm text-destructive">{errors.country_residence.message}</p>
              )}
            </div>

            {/* Primary Locale */}
            <div className="space-y-2">
              <Label htmlFor="locale_primary">Primary Locale *</Label>
              <Select
                value={watch('locale_primary')}
                onValueChange={(value) => setValue('locale_primary', value)}
              >
                <SelectTrigger id="locale_primary">
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
              {errors.locale_primary && (
                <p className="text-sm text-destructive">{errors.locale_primary.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
            <CardDescription>Important dates and milestones</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hire Date */}
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date *</Label>
              <Input
                id="hire_date"
                type="date"
                {...register('hire_date')}
              />
              {errors.hire_date && (
                <p className="text-sm text-destructive">{errors.hire_date.message}</p>
              )}
            </div>

            {/* RTW DateTime */}
            <div className="space-y-2">
              <Label htmlFor="rtw_datetime">RTW Date/Time</Label>
              <Input
                id="rtw_datetime"
                type="datetime-local"
                {...register('rtw_datetime')}
              />
            </div>

            {/* BGC Expiration */}
            <div className="space-y-2">
              <Label htmlFor="bgc_expiration_date">BGC Expiration Date</Label>
              <Input
                id="bgc_expiration_date"
                type="date"
                {...register('bgc_expiration_date')}
              />
            </div>

            {/* Termination Date */}
            <div className="space-y-2">
              <Label htmlFor="termination_date">Termination Date</Label>
              <Input
                id="termination_date"
                type="date"
                {...register('termination_date')}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Worker'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/workers')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
