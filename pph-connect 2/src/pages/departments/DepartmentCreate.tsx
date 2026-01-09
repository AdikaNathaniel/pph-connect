import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { departmentSchema, type DepartmentFormData } from '@/lib/schemas/department'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

export function DepartmentCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  })

  // Create department mutation
  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      const { error } = await supabase.from('departments').insert({
        department_name: data.department_name,
        description: data.description || null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['departments-list'] })
      navigate('/departments')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create department')
    },
  })

  const onSubmit = (data: DepartmentFormData) => {
    setError(null)
    createMutation.mutate(data)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" onClick={() => navigate('/departments')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
        <h1 className="text-3xl font-bold">Create Department</h1>
        <p className="text-muted-foreground">Add a new department to the organization</p>
      </div>

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
              <p className="text-xs text-muted-foreground">
                Must be unique across all departments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the department's responsibilities and focus areas"
                rows={4}
                {...register('description')}
              />
              <p className="text-xs text-muted-foreground">
                Provide additional context about this department
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/departments')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Department'}
          </Button>
        </div>
      </form>
    </div>
  )
}
