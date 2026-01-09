import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import type { TeamFormValues } from '@/types/app';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast';

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Team name is required')
    .max(120, 'Team name must be 120 characters or fewer'),
  departmentId: z.string().trim().min(1, 'Department is required'),
  localePrimary: z.string().trim().min(1, 'Primary locale is required'),
  localeSecondary: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable(),
  region: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable(),
  isActive: z.boolean()
});

type DepartmentOption = {
  id: string;
  name: string;
  code?: string | null;
};

export interface TeamFormProps {
  mode: 'create' | 'update';
  onSubmit: (values: TeamFormValues) => Promise<void> | void;
  onCancel?: () => void;
  initialValues?: TeamFormValues;
  departmentOptions: DepartmentOption[];
  localeOptions: string[];
  regionOptions: string[];
  isSubmitting?: boolean;
  className?: string;
}

const normalizeOptional = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : null;

export const TeamForm: React.FC<TeamFormProps> = ({
  mode,
  onSubmit,
  onCancel,
  initialValues,
  departmentOptions,
  localeOptions,
  regionOptions,
  isSubmitting = false,
  className
}) => {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: initialValues ?? {
      name: '',
      departmentId: departmentOptions[0]?.id ?? '',
      localePrimary: localeOptions[0] ?? '',
      localeSecondary: null,
      region: null,
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
  // formState.errors.name / formState.errors.departmentId / formState.errors.localePrimary -> used for UI feedback

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const handleFormSubmit = async (values: TeamFormValues) => {
    try {
      const parsed = teamFormSchema.parse(values);
      const payload: TeamFormValues = {
        ...parsed,
        localeSecondary: normalizeOptional(parsed.localeSecondary ?? null),
        region: normalizeOptional(parsed.region ?? null)
      };
      await Promise.resolve(onSubmit(payload));
      if (mode === 'create') {
        reset({
          name: '',
          departmentId: departmentOptions[0]?.id ?? '',
          localePrimary: localeOptions[0] ?? '',
          localeSecondary: null,
          region: null,
          isActive: true
        });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      const message = toUserFacingMessage(normalized);
      console.error('Failed to submit team form', error);
      showErrorToast('Unable to save team', { description: message });
    }
  };

  const renderDepartmentLabel = (option: DepartmentOption) =>
    option.code ? `${option.name} (${option.code})` : option.name;

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn('space-y-6', className)}
        data-testid="team-form"
      >
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="E.g., Data Labeling"
                  data-testid="team-form-name"
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
              </FormControl>
              <FormDescription>Display label that appears across staffing workloads.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  data-testid="team-form-department"
                >
                  <FormControl>
                    <SelectTrigger aria-invalid={errors.departmentId ? 'true' : 'false'}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {renderDepartmentLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="localePrimary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Locale</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  data-testid="team-form-locale-primary"
                >
                  <FormControl>
                    <SelectTrigger aria-invalid={errors.localePrimary ? 'true' : 'false'}>
                      <SelectValue placeholder="Select locale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {localeOptions.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {locale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="localeSecondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Locale</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  data-testid="team-form-locale-secondary"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional secondary locale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {localeOptions.map((locale) => (
                      <SelectItem key={`secondary-${locale}`} value={locale}>
                        {locale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locale Region</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  data-testid="team-form-region"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional region" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {regionOptions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3">
              <div className="space-y-1">
                <FormLabel>Active Team</FormLabel>
                <FormDescription>
                  Toggle whether this team is available for staffing new projects.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="team-form-active"
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
          <Button type="submit" disabled={isSubmitting} data-testid="team-form-submit">
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Team' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TeamForm;
