import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import type { WorkerFormValues } from '@/types/app';
import { supabase } from '@/integrations/supabase/client';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast';

const optionalText = z
  .string()
  .trim()
  .max(255, 'Too many characters')
  .optional()
  .or(z.literal(''));

export const workerFormSchema = z.object({
  hrId: z.string().trim().min(1, 'HR ID is required').max(64, 'HR ID is too long'),
  fullName: z.string().trim().min(1, 'Full name is required').max(160, 'Full name is too long'),
  engagementModel: z.string().trim().min(1, 'Select an engagement model'),
  workerRole: optionalText,
  emailPersonal: z.string().trim().email('Provide a valid personal email address'),
  emailPph: z
    .string()
    .trim()
    .email('Provide a valid PPH email address')
    .optional()
    .or(z.literal('')),
  countryResidence: z.string().trim().min(1, 'Select a country'),
  localePrimary: z.string().trim().min(1, 'Select a primary locale'),
  localeAll: z.array(z.string().trim().min(1)).min(1, 'Select at least one locale'),
  hireDate: z.string().trim().min(1, 'Hire date is required'),
  rtwDateTime: optionalText,
  supervisorId: optionalText,
  terminationDate: optionalText,
  bgcExpirationDate: optionalText,
  status: z.string().trim().min(1, 'Select a worker status')
});

type WorkerFormSchema = z.infer<typeof workerFormSchema>;

export interface WorkerFormOption {
  value: string;
  label: string;
  description?: string;
}

const UNIQUE_FIELD_TO_COLUMN: Record<'hrId' | 'emailPersonal' | 'emailPph', string> = {
  'hrId': 'hr_id',
  'emailPersonal': 'email_personal',
  'emailPph': 'email_pph'
};

export interface WorkerFormProps {
  initialValues?: Partial<WorkerFormValues>;
  mode?: 'create' | 'update';
  engagementModels: WorkerFormOption[];
  statuses: WorkerFormOption[];
  countries: WorkerFormOption[];
  locales: WorkerFormOption[];
  supervisors: WorkerFormOption[];
  onSubmit: (values: WorkerFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  currentWorkerId?: string;
}

const normalizeOptionValue = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value.trim() : null;

const buildDefaultValues = (initialValues?: Partial<WorkerFormValues>): WorkerFormSchema => ({
  hrId: initialValues?.hrId ?? '',
  fullName: initialValues?.fullName ?? '',
  engagementModel: initialValues?.engagementModel ?? '',
  workerRole: initialValues?.workerRole ?? '',
  emailPersonal: initialValues?.emailPersonal ?? '',
  emailPph: initialValues?.emailPph ?? '',
  countryResidence: initialValues?.countryResidence ?? '',
  localePrimary: initialValues?.localePrimary ?? '',
  localeAll: initialValues?.localeAll ?? [],
  hireDate: initialValues?.hireDate ?? '',
  rtwDateTime: initialValues?.rtwDateTime ?? '',
  supervisorId: initialValues?.supervisorId ?? '',
  terminationDate: initialValues?.terminationDate ?? '',
  bgcExpirationDate: initialValues?.bgcExpirationDate ?? '',
  status: initialValues?.status ?? ''
});

export const WorkerForm: React.FC<WorkerFormProps> = ({
  initialValues,
  mode = 'create',
  engagementModels,
  statuses,
  countries,
  locales,
  supervisors,
  onSubmit,
  onCancel,
  isSubmitting,
  currentWorkerId
}) => {
  const defaultValues = useMemo(() => buildDefaultValues(initialValues), [initialValues]);

  const form = useForm<WorkerFormSchema>({
    resolver: zodResolver(workerFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange'
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const latestChecksRef = useRef<Record<string, string>>({});
  const [supervisorPopoverOpen, setSupervisorPopoverOpen] = useState(false);

  const runUniqueCheck = useCallback(
    async (fieldName: 'hrId' | 'emailPersonal' | 'emailPph', rawValue: string) => {
      const trimmedValue = rawValue.trim();
      latestChecksRef.current[fieldName] = trimmedValue;

      if (!trimmedValue) {
        form.clearErrors(fieldName);
        return;
      }

      try {
        let query = supabase
          .from('workers')
          .select('id')
          .eq(UNIQUE_FIELD_TO_COLUMN[fieldName], trimmedValue)
          .limit(1);

        if (currentWorkerId) {
          query = query.neq('id', currentWorkerId);
        }

        const { data, error } = await query;

        if (latestChecksRef.current[fieldName] !== trimmedValue) {
          return;
        }

        if (error) {
          form.setError(fieldName, {
            type: 'validate',
            message: 'Could not verify uniqueness. Try again.'
          });
          return;
        }

        if (data && data.length > 0) {
          form.setError(fieldName, {
            type: 'validate',
            message: 'This value is already in use by another worker.'
          });
        } else if (form.getFieldState(fieldName).error?.type === 'validate') {
          form.clearErrors(fieldName);
        }
      } catch (error) {
        if (latestChecksRef.current[fieldName] !== trimmedValue) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Unable to verify uniqueness right now.';
        form.setError(fieldName, {
          type: 'validate',
          message
        });
      }
    },
    [currentWorkerId, form]
  );

  const primaryLocale = form.watch('localePrimary');

  useEffect(() => {
    if (!primaryLocale) {
      return;
    }
    const allLocales = form.getValues('localeAll');
    if (!allLocales.includes(primaryLocale)) {
      form.setValue('localeAll', [...allLocales, primaryLocale]);
    }
  }, [form, primaryLocale]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');

    const normalized: WorkerFormValues = {
      hrId: values.hrId.trim(),
      fullName: values.fullName.trim(),
      engagementModel: values.engagementModel.trim() as WorkerFormValues['engagementModel'],
      workerRole: normalizeOptionValue(values.workerRole),
      emailPersonal: values.emailPersonal.trim(),
      emailPph: normalizeOptionValue(values.emailPph),
      countryResidence: values.countryResidence.trim(),
      localePrimary: values.localePrimary.trim(),
      localeAll: Array.from(new Set(values.localeAll.map((entry) => entry.trim()).filter(Boolean))),
      hireDate: values.hireDate,
      rtwDateTime: normalizeOptionValue(values.rtwDateTime),
      supervisorId: normalizeOptionValue(values.supervisorId),
      terminationDate: normalizeOptionValue(values.terminationDate),
      bgcExpirationDate: normalizeOptionValue(values.bgcExpirationDate),
      status: values.status.trim() as WorkerFormValues['status']
    };

    try {
      await onSubmit(normalized);
    } catch (error) {
      const normalized = normalizeError(error);
      const message = toUserFacingMessage(normalized);
      console.error('Failed to submit worker form', error);
      form.setError('root', { message });
      showErrorToast('Unable to save worker', { description: message });
    }
  });

  const effectiveIsSubmitting = form.formState.isSubmitting || Boolean(isSubmitting);
  const selectedLocales = form.watch('localeAll');

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="hrId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HR ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="HR-000123"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={async (event) => {
                      field.onBlur();
                      await runUniqueCheck('hrId', event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Worker" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engagementModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engagement model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {engagementModels.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workerRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worker role</FormLabel>
                <FormControl>
                  <Input placeholder="Content Reviewer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emailPersonal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane.worker@example.com"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={async (event) => {
                      field.onBlur();
                      await runUniqueCheck('emailPersonal', event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emailPph"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PPH email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane.worker@pphconnect.com"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={async (event) => {
                      field.onBlur();
                      await runUniqueCheck('emailPph', event.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>Optional internal alias for Maestro workspaces.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryResidence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country of residence</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="localePrimary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary locale</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary locale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locales.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hire date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rtwDateTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ready-to-work date &amp; time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>Optional go-live timestamp for workforce routing.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supervisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supervisor</FormLabel>
                <Popover open={supervisorPopoverOpen} onOpenChange={setSupervisorPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={supervisorPopoverOpen}
                        className="w-full justify-between"
                      >
                        {field.value
                          ? supervisors.find((option) => option.value === field.value)?.label
                          : 'Select supervisor'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search supervisors..." />
                      <CommandList>
                        <CommandEmpty>No supervisors found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              field.onChange('');
                              setSupervisorPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${field.value ? 'opacity-0' : 'opacity-100'}`}
                            />
                            No supervisor
                          </CommandItem>
                          {supervisors.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => {
                                const nextValue = field.value === option.value ? '' : option.value;
                                field.onChange(nextValue);
                                setSupervisorPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${field.value === option.value ? 'opacity-100' : 'opacity-0'}`}
                              />
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terminationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termination date</FormLabel>
                <FormControl>
                  <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bgcExpirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BGC expiration date</FormLabel>
                <FormControl>
                  <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
          control={form.control}
          name="localeAll"
          render={({ field }) => (
            <FormItem
              className="space-y-3"
              data-testid="worker-form-locale-all"
            >
              <FormLabel>Supported locales</FormLabel>
              <FormDescription>Select every locale this worker can support.</FormDescription>
              <div className="rounded-md border border-border/60">
                <ScrollArea className="max-h-48">
                  <div className="flex flex-col gap-2 p-3">
                    {locales.map((option) => {
                      const checked = field.value?.includes(option.value) ?? false;
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 text-sm text-foreground"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              const next = new Set(field.value ?? []);
                              if (isChecked) {
                                next.add(option.value);
                              } else {
                                next.delete(option.value);
                              }
                              field.onChange(Array.from(next));
                            }}
                          />
                          <span className="flex flex-col">
                            <span>{option.label}</span>
                            {option.description ? (
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              {selectedLocales?.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedLocales.map((locale) => {
                    const option = locales.find((item) => item.value === locale);
                    return (
                      <Badge key={locale} variant="secondary">
                        {option?.label ?? locale}
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        {(form.formState.errors.root || form.formState.errors.localeAll) && (
          <div role="alert" className="text-sm text-destructive">
            {form.formState.errors.root?.message ?? form.formState.errors.localeAll?.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={effectiveIsSubmitting}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            data-testid="worker-form-submit"
            disabled={effectiveIsSubmitting}
          >
            {effectiveIsSubmitting
              ? mode === 'create'
                ? 'Creating worker…'
                : 'Saving changes…'
              : mode === 'create'
                ? 'Create worker'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkerForm;
