import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type RatesPayableRow = Database['public']['Tables']['rates_payable']['Row'];
type WorkerAccountRow = Database['public']['Tables']['worker_accounts']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type LocaleMappingRow = Database['public']['Tables']['locale_mappings']['Row'];

export type RateQuote = {
  rateCardId: string | null;
  ratePerUnit: number | null;
  ratePerHour: number | null;
  currency: string | null;
  locale: string | null;
  source: 'worker' | 'project' | 'fallback';
};

const normalizeLocale = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

const getWorkerLocale = async (workerId: string) => {
  const { data } = await supabase
    .from('worker_accounts')
    .select('locale')
    .eq('worker_id', workerId)
    .eq('is_current', true)
    .maybeSingle();
  return (data as WorkerAccountRow | null)?.locale ?? null;
};

const getProjectLocale = async (projectId: string) => {
  const { data } = await supabase
    .from('projects')
    .select('locale')
    .eq('id', projectId)
    .maybeSingle();
  return (data as ProjectRow | null)?.locale ?? null;
};

const fetchLocaleMappings = async () => {
  const { data } = await supabase.from('locale_mappings').select('client_locale, iso_locale');
  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    const mapping = row as LocaleMappingRow;
    map.set(normalizeLocale(mapping.client_locale), mapping.iso_locale);
  });
  return map;
};

const fetchRates = async (locale: string, date: string) => {
  const { data } = await supabase
    .from('rates_payable')
    .select('*')
    .eq('locale', locale)
    .lte('effective_from', date)
    .or(['effective_to.is.null', `effective_to.gte.${date}`].join(','))
    .order('effective_from', { ascending: false })
    .limit(1);
  return (data ?? []) as RatesPayableRow[];
};

export const getRateForWorker = async (
  workerId: string,
  projectId: string,
  date: string
): Promise<RateQuote> => {
  const [workerLocaleRaw, projectLocaleRaw, localeMappings] = await Promise.all([
    getWorkerLocale(workerId),
    getProjectLocale(projectId),
    fetchLocaleMappings()
  ]);

  const workerLocale = localeMappings.get(normalizeLocale(workerLocaleRaw)) ?? workerLocaleRaw;
  if (workerLocale) {
    const [rate] = await fetchRates(workerLocale, date);
    if (rate) {
      return {
        rateCardId: rate.id,
        ratePerUnit: rate.rate_per_unit,
        ratePerHour: rate.rate_per_hour,
        currency: rate.currency,
        locale: workerLocale,
        source: 'worker'
      };
    }
  }

  const projectLocale = localeMappings.get(normalizeLocale(projectLocaleRaw)) ?? projectLocaleRaw;
  // project_id fallback: rates scoped to a project should use the project's locale when worker locale is missing
  if (projectLocale) {
    const [rate] = await fetchRates(projectLocale, date);
    if (rate) {
      return {
        rateCardId: rate.id,
        ratePerUnit: rate.rate_per_unit,
        ratePerHour: rate.rate_per_hour,
        currency: rate.currency,
        locale: projectLocale,
        source: 'project'
      };
    }
  }

  const fallbackLocale = workerLocale ?? projectLocale ?? null;
  return {
    rateCardId: null,
    ratePerUnit: null,
    ratePerHour: null,
    currency: null,
    locale: fallbackLocale,
    source: 'fallback'
  };
};

export default getRateForWorker;
