import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { ProjectFormValues } from '@/types/app';
import type { Database } from '@/integrations/supabase/types';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast';

const projectStatusValues = ['planned', 'active', 'paused', 'completed', 'archived'] as const;

export const projectFormSchema = z.object({
    code: z
      .string()
      .trim()
      .min(1, 'Project code is required')
      .max(32, 'Project code must be 32 characters or fewer')
      .regex(/^[A-Z0-9\-_]+$/, 'Use uppercase letters, numbers, hyphen, or underscore'),
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(120, 'Project name must be 120 characters or fewer'),
    status: z.enum(projectStatusValues, {
      errorMap: () => ({ message: 'Status is required' })
    }),
    departmentId: z.string().trim().min(1, 'Department is required'),
    expertTier: z
      .enum(['tier_1', 'tier_2', 'tier_3', 'specialist'] as const, {
        errorMap: () => ({ message: 'Expert tier is required' })
      })
      .nullable(),
    startDate: z
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    endDate: z
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be 500 characters or fewer')
      .optional(),
    assignTeamIds: z.array(z.string()).default([])
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true;
      }
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  );

export interface ProjectFormProps {
  mode: 'create' | 'update';
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  onCancel?: () => void;
  initialValues?: ProjectFormValues;
  departmentOptions: Array<{ id: string; name: string; code?: string | null }>;
  tierOptions: Array<Database['public']['Enums']['expert_tier']>;
  statusOptions?: Array<typeof projectStatusValues[number]>;
  isSubmitting?: boolean;
  className?: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  mode,
  onSubmit,
  onCancel,
  initialValues,
  departmentOptions,
  tierOptions,
  statusOptions = projectStatusValues,
  isSubmitting = false,
  className
}) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialValues ?? {
      code: '',
      name: '',
      status: 'planned',
      departmentId: departmentOptions[0]?.id ?? '',
      expertTier: tierOptions[0] ?? null,
      startDate: null,
      endDate: null,
      description: '',
      assignTeamIds: []
    },
    mode: 'onSubmit'
  });

const {
  control,
  handleSubmit,
  reset,
  formState: { isDirty, errors }
} = form;
// formState.errors.code / formState.errors.name / formState.errors.status -> used for UI feedback

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const handleFormSubmit: SubmitHandler<ProjectFormValues> = async (values) => {
    try {
      projectFormSchema.parse(values);
      await Promise.resolve(onSubmit(values));
      if (mode === 'create') {
        reset({
          code: '',
          name: '',
          status: 'planned',
          departmentId: departmentOptions[0]?.id ?? '',
          expertTier: tierOptions[0] ?? null,
          startDate: null,
          endDate: null,
          description: '',
          assignTeamIds: []
        });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      const message = toUserFacingMessage(normalized);
      console.error('Failed to submit project form', error);
      showErrorToast('Unable to save project', { description: message });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn('space-y-6', className)}
        data-testid="project-form"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid="project-form-code"
                    placeholder="E.g., ATL-001"
                    autoCapitalize="characters"
                    aria-invalid={errors.code ? 'true' : 'false'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid="project-form-name"
                    placeholder="Customer onboarding audit"
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value)}
                    aria-invalid={errors.departmentId ? 'true' : 'false'}
                  >
                    <SelectTrigger data-testid="project-form-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code ? `${dept.name} (${dept.code})` : dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as ProjectFormValues['status'])}
                    aria-invalid={errors.status ? 'true' : 'false'}
                  >
                    <SelectTrigger data-testid="project-form-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="expertTier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expert Tier</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value as ProjectFormValues['expertTier'])}
                    aria-invalid={errors.expertTier ? 'true' : 'false'}
                  >
                    <SelectTrigger data-testid="project-form-tier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tierOptions.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      data-testid="project-form-start-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      data-testid="project-form-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  data-testid="project-form-description"
                  placeholder="Optional summary of project goals"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="project-form-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (mode === 'update' && !isDirty)}
            data-testid="project-form-submit"
          >
            {mode === 'create' ? 'Create project' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectForm;
