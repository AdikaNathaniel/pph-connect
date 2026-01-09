import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { teamSchema, type TeamFormData } from '@/lib/schemas/team'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from 'lucide-react'

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ko', label: 'Korean' },
  { value: 'hi', label: 'Hindi' },
]

const REGIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'EU', label: 'Europe' },
  { value: 'MX', label: 'Mexico' },
  { value: 'BR', label: 'Brazil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'ES', label: 'Spain' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'PH', label: 'Philippines' },
  { value: 'AU', label: 'Australia' },
]

export function TeamCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      is_active: true,
    },
  })

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, department_name').order('department_name')

      if (error) throw error
      return data
    },
  })

  // Create team mutation
  const createMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const { error } = await supabase.from('teams').insert({
        team_name: data.team_name,
        department_id: data.department_id,
        locale_primary: data.locale_primary,
        locale_secondary: data.locale_secondary || null,
        locale_region: data.locale_region || null,
        is_active: data.is_active,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      navigate('/teams')
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to create team')
    },
  })

  const onSubmit = (data: TeamFormData) => {
    setError(null)
    createMutation.mutate(data)
  }

  const selectedPrimaryLocale = watch('locale_primary')
  const selectedSecondaryLocale = watch('locale_secondary')
  const selectedLocaleRegion = watch('locale_region')
  const selectedDepartmentId = watch('department_id')
  const isActive = watch('is_active') ?? true

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" onClick={() => navigate('/teams')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
        <h1 className="text-3xl font-bold">Create Team</h1>
        <p className="text-muted-foreground">Add a new language-based team to the system</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Team identification and department assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">
                  Team Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="team_name"
                  placeholder="e.g., Spanish Annotation Team"
                  {...register('team_name')}
                  aria-invalid={!!errors.team_name}
                />
                {errors.team_name && <p className="text-sm text-destructive">{errors.team_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedDepartmentId} onValueChange={(value) => setValue('department_id', value)}>
                  <SelectTrigger id="department_id">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && <p className="text-sm text-destructive">{errors.department_id.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locale Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Locale Configuration</CardTitle>
            <CardDescription>Language and region settings for the team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locale_primary">
                  Primary Locale <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedPrimaryLocale} onValueChange={(value) => setValue('locale_primary', value)}>
                  <SelectTrigger id="locale_primary">
                    <SelectValue placeholder="Select primary locale" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((locale) => (
                      <SelectItem key={locale.value} value={locale.value}>
                        {locale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locale_primary && <p className="text-sm text-destructive">{errors.locale_primary.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale_secondary">Secondary Locale</Label>
                <Select
                  value={selectedSecondaryLocale || 'none'}
                  onValueChange={(value) => setValue('locale_secondary', value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="locale_secondary">
                    <SelectValue placeholder="Select secondary locale (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LOCALES.map((locale) => (
                      <SelectItem key={locale.value} value={locale.value}>
                        {locale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale_region">Locale Region</Label>
              <Select
                value={selectedLocaleRegion || 'none'}
                onValueChange={(value) => setValue('locale_region', value === 'none' ? '' : value)}
              >
                <SelectTrigger id="locale_region">
                  <SelectValue placeholder="Select region (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optional geographic region for locale specialization</p>
            </div>
          </CardContent>
        </Card>

        {/* Team Status */}
        <Card>
          <CardHeader>
            <CardTitle>Team Status</CardTitle>
            <CardDescription>Set the team's active status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Team is active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/teams')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Team'}
          </Button>
        </div>
      </form>
    </div>
  )
}
