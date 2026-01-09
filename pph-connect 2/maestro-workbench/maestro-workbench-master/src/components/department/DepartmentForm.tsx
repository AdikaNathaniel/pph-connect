import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { DepartmentFormValues } from '@/types/app';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast';

export const departmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Department name is required')
    .max(80, 'Department name must be 80 characters or fewer'),
  code: z
    .string()
    .trim()
    .min(1, 'Department code is required')
    .max(10, 'Department code must be 10 characters or fewer')
    .regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, numbers, hyphen, or underscore'),
  isActive: z.boolean()
});

export interface DepartmentFormProps {
  mode: 'create' | 'update';
  onSubmit: (values: DepartmentFormValues) => Promise<void> | void;
  onCancel?: () => void;
  initialValues?: DepartmentFormValues;
  isSubmitting?: boolean;
  isCodeEditable?: boolean;
  className?: string;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({
  mode,
  onSubmit,
  onCancel,
  initialValues,
  isSubmitting = false,
  isCodeEditable = true,
  className
}) => {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: initialValues ?? {
      name: '',
      code: '',
      isActive: true
    },
    mode: 'onSubmit'
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = form;
  // formState.errors.name / formState.errors.code -> used for UI feedback

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const handleFormSubmit = async (values: DepartmentFormValues) => {
    try {
      const payload = departmentFormSchema.parse(values);
      await Promise.resolve(onSubmit(payload));
      if (mode === 'create') {
        reset({
          name: '',
          code: '',
          isActive: true
        });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      const message = toUserFacingMessage(normalized);
      console.error('Failed to submit department form', error);
      showErrorToast('Unable to save department', { description: message });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn('space-y-6', className)}
        data-testid="department-form"
      >
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="E.g., AI Services"
                  data-testid="department-form-name"
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
              </FormControl>
              <FormDescription>Display name shown across staffing and analytics.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="AI"
                  data-testid="department-form-code"
                  aria-invalid={errors.code ? 'true' : 'false'}
                  disabled={!isCodeEditable}
                />
              </FormControl>
              <FormDescription>
                Short identifier used in project codes. {isCodeEditable ? 'Use uppercase letters, numbers, hyphen, or underscore.' : 'Immutable message: this code cannot be changed after creation.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3">
              <div className="space-y-1">
                <FormLabel>Active Department</FormLabel>
                <FormDescription>
                  Toggle whether this department is available for new projects.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="department-form-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting} data-testid="department-form-submit">
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Department' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DepartmentForm;
