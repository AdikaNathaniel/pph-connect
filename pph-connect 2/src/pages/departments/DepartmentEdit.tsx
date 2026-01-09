import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { departmentSchema, type DepartmentFormData } from '@/lib/schemas/department'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export function DepartmentEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  })

  // Fetch department data
  const { data: department, isLoading: isLoadingDepartment } = useQuery({
    queryKey: ['department', id],
    queryFn: async () => {
      if (!id) throw new Error('Department ID is required')

      const { data, error } = await supabase.from('departments').select('*').eq('id', id).single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Fetch counts to show warning about deletion
  // Note: Workers don't have department_id - they relate to departments via project assignments
  const { data: counts } = useQuery({
    queryKey: ['department-usage', id],
    queryFn: async () => {
      if (!id) return { teams: 0, projects: 0 }

      const [teamsRes, projectsRes] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('department_id', id),
        supabase.from('workforce_projects').select('id', { count: 'exact', head: true }).eq('department_id', id),
      ])

      return {
        teams: teamsRes.count || 0,
        projects: projectsRes.count || 0,
      }
    },
    enabled: !!id,
  })

  // Pre-populate form when department data loads
  useEffect(() => {
    if (department) {
      reset({
        department_name: department.department_name,
        description: department.description || '',
      })
    }
  }, [department, reset])

  // Update department mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      if (!id) throw new Error('Department ID is required')

      const { error } = await supabase
        .from('departments')
        .update({
          department_name: data.department_name,
          description: data.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['departments-list'] })
      queryClient.invalidateQueries({ queryKey: ['department', id] })
      navigate('/departments')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update department')
    },
  })

  const onSubmit = (data: DepartmentFormData) => {
    setError(null)
    updateMutation.mutate(data)
  }

  // Loading state
  if (isLoadingDepartment) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!department) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Department not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const hasUsage = (counts?.teams || 0) > 0 || (counts?.projects || 0) > 0

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" onClick={() => navigate('/departments')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
        <h1 className="text-3xl font-bold">Edit Department</h1>
        <p className="text-muted-foreground">Update department information</p>
      </div>

      {/* Usage Warning */}
      {hasUsage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This department has <strong>{counts?.teams || 0} team(s)</strong> and{' '}
            <strong>{counts?.projects || 0} project(s)</strong> assigned to it. Deletion is not allowed while resources
            are associated.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Department Information */}
        <Card>
          <CardHeader>
            <CardTitle>Department Information</CardTitle>
            <CardDescription>Basic details about the department</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department_name">
                Department Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="department_name"
                placeholder="e.g., Annotation, Quality Assurance, Operations"
                {...register('department_name')}
                aria-invalid={!!errors.department_name}
              />
              {errors.department_name && <p className="text-sm text-destructive">{errors.department_name.message}</p>}
              <p className="text-xs text-muted-foreground">Must be unique across all departments</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the department's responsibilities and focus areas"
                rows={4}
                {...register('description')}
              />
              <p className="text-xs text-muted-foreground">Provide additional context about this department</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/departments')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
