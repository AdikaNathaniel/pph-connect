import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { projectSchema, type ProjectFormData } from '@/lib/schemas/project'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft } from 'lucide-react'

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const EXPERT_TIERS = [
  { value: 'tier0', label: 'Tier 0', description: 'Entry-level annotators' },
  { value: 'tier1', label: 'Tier 1', description: 'Experienced annotators' },
  { value: 'tier2', label: 'Tier 2', description: 'Expert annotators' },
]

export function ProjectCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'active',
      expert_tier: 'tier0',
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

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase.from('workforce_projects').insert({
        project_code: data.project_code,
        project_name: data.project_name,
        department_id: data.department_id,
        expert_tier: data.expert_tier,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create project')
    },
  })

  const onSubmit = (data: ProjectFormData) => {
    setError(null)
    createMutation.mutate(data)
  }

  const selectedTier = watch('expert_tier')
  const selectedDepartment = watch('department_id')
  const selectedStatus = watch('status')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <h1 className="text-3xl font-bold">Create Project</h1>
        <p className="text-muted-foreground">Add a new workforce project to the system</p>
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
            <CardDescription>Project identification and basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_code">
                  Project Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project_code"
                  placeholder="e.g., PROJ-001"
                  {...register('project_code')}
                  aria-invalid={!!errors.project_code}
                />
                {errors.project_code && (
                  <p className="text-sm text-destructive">{errors.project_code.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Unique identifier (letters, numbers, hyphens, underscores)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project_name"
                  placeholder="e.g., Data Annotation Project"
                  {...register('project_name')}
                  aria-invalid={!!errors.project_name}
                />
                {errors.project_name && <p className="text-sm text-destructive">{errors.project_name.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Project Configuration</CardTitle>
            <CardDescription>Department assignment and expert tier requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedDepartment} onValueChange={(value) => setValue('department_id', value)}>
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

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedStatus} onValueChange={(value) => setValue('status', value as any)}>
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
            </div>

            <div className="space-y-3">
              <Label>
                Expert Tier <span className="text-destructive">*</span>
              </Label>
              <RadioGroup value={selectedTier} onValueChange={(value) => setValue('expert_tier', value as any)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {EXPERT_TIERS.map((tier) => (
                    <div key={tier.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={tier.value} id={tier.value} className="mt-1" />
                      <div className="flex flex-col">
                        <Label htmlFor={tier.value} className="font-medium cursor-pointer">
                          {tier.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Project start and end dates (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" {...register('end_date')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
