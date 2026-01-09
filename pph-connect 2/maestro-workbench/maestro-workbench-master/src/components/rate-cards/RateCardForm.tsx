import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProjectExpertTier = Database['public']['Enums']['project_expert_tier'];

const schema = z
  .object({
    locale: z.string().min(1, 'Locale is required'),
    expertTier: z.string().min(1, 'Expert tier is required'),
    country: z.string().min(1, 'Country is required'),
    ratePerUnit: z.string().optional(),
    ratePerHour: z.string().optional(),
    currency: z.string().min(1, 'Currency is required'),
    effectiveFrom: z.string().min(1, 'Effective from date is required'),
    effectiveTo: z.string().optional()
  })
  .superRefine((values, ctx) => {
    if (!values.ratePerUnit && !values.ratePerHour) {
      ctx.addIssue({
        path: ['ratePerUnit'],
        code: z.ZodIssueCode.custom,
        message: 'Provide either rate per unit or rate per hour'
      });
      ctx.addIssue({
        path: ['ratePerHour'],
        code: z.ZodIssueCode.custom,
        message: 'Provide either rate per unit or rate per hour'
      });
    }
    if (values.effectiveTo && new Date(values.effectiveTo) <= new Date(values.effectiveFrom)) {
      ctx.addIssue({
        path: ['effectiveTo'],
        code: z.ZodIssueCode.custom,
        message: 'Effective to must be after effective from'
      });
    }
  });

export type RateCardFormValues = z.infer<typeof schema>;

export interface RateCardFormProps {
  mode: 'create' | 'update';
  initialValues?: Partial<RateCardFormValues>;
  rateCardId?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const EXPERT_TIERS: ProjectExpertTier[] = ['standard', 'premium', 'elite'];

export const RateCardForm: React.FC<RateCardFormProps> = ({
  mode,
  initialValues,
  rateCardId,
  onSubmit,
  onCancel
}) => {
  const form = useForm<RateCardFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      locale: initialValues?.locale ?? '',
      expertTier: initialValues?.expertTier ?? EXPERT_TIERS[0],
      country: initialValues?.country ?? '',
      ratePerUnit: initialValues?.ratePerUnit ?? '',
      ratePerHour: initialValues?.ratePerHour ?? '',
      currency: initialValues?.currency ?? '',
      effectiveFrom: initialValues?.effectiveFrom ?? '',
      effectiveTo: initialValues?.effectiveTo ?? ''
    }
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        locale: values.locale,
        expert_tier: values.expertTier,
        country: values.country,
        rate_per_unit: values.ratePerUnit ? Number(values.ratePerUnit) : null,
        rate_per_hour: values.ratePerHour ? Number(values.ratePerHour) : null,
        currency: values.currency,
        effective_from: values.effectiveFrom,
        effective_to: values.effectiveTo || null
      };
      if (mode === 'create') {
        const { error } = await supabase.from('rates_payable').insert(payload);
        if (error) throw error;
        toast.success('Rate card created');
      } else if (mode === 'update' && rateCardId) {
        const { error } = await supabase.from('rates_payable').update(payload).eq('id', rateCardId);
        if (error) throw error;
        toast.success('Rate card updated');
      }
      onSubmit?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save rate card');
    }
  });

  const submitLabel = useMemo(() => (mode === 'create' ? 'Create rate card' : 'Update rate card'), [mode]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rate-locale">Locale</Label>
          <Input id="rate-locale" {...form.register('locale')} name="locale" />
          <p className="text-xs text-red-500">{form.formState.errors.locale?.message}</p>
        </div>
        <div className="space-y-2">
          <Label>Expert tier</Label>
          <Select
            name="expertTier"
            defaultValue={form.getValues('expertTier')}
            onValueChange={(value) => form.setValue('expertTier', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              {EXPERT_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-red-500">{form.formState.errors.expertTier?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-country">Country</Label>
          <Input id="rate-country" {...form.register('country')} name="country" />
          <p className="text-xs text-red-500">{form.formState.errors.country?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-currency">Currency</Label>
          <Input id="rate-currency" {...form.register('currency')} name="currency" />
          <p className="text-xs text-red-500">{form.formState.errors.currency?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-per-unit">Rate per unit</Label>
          <Input id="rate-per-unit" type="number" step="any" {...form.register('ratePerUnit')} name="ratePerUnit" />
          <p className="text-xs text-red-500">{form.formState.errors.ratePerUnit?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-per-hour">Rate per hour</Label>
          <Input id="rate-per-hour" type="number" step="any" {...form.register('ratePerHour')} name="ratePerHour" />
          <p className="text-xs text-red-500">{form.formState.errors.ratePerHour?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-effective-from">Effective from</Label>
          <Input id="rate-effective-from" type="date" {...form.register('effectiveFrom')} name="effectiveFrom" />
          <p className="text-xs text-red-500">{form.formState.errors.effectiveFrom?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-effective-to">Effective to</Label>
          <Input id="rate-effective-to" type="date" {...form.register('effectiveTo')} name="effectiveTo" />
          <p className="text-xs text-red-500">{form.formState.errors.effectiveTo?.message}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button data-testid="rate-card-form-submit" type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default RateCardForm;
