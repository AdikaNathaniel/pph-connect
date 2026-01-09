import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { parse } from 'papaparse';
import { validateStatsRows, type StatsRow } from './validation';

type WorkerAccountRow = Database['public']['Tables']['worker_accounts']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type LocaleMappingRow = Database['public']['Tables']['locale_mappings']['Row'];
type RatesPayableRow = Database['public']['Tables']['rates_payable']['Row'];

export interface StatsImportOptions {
  csv: string;
  defaultLocale?: string;
  batchSize?: number;
}

export interface StatsImportResult {
  inserted: number;
  skipped: number;
  validationMessages: Awaited<ReturnType<typeof validateStatsRows>>['messages'];
}

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_BATCH_SIZE = 50;

const normalizeKey = (value: string) => value.trim().toLowerCase();

export const parseStatsCsv = (csv: string): StatsRow[] => {
  const result = parse(csv, {
    header: true,
    skipEmptyLines: true
  });
  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? 'Unable to parse stats CSV');
  }
  return (result.data as StatsRow[]).map((row) => ({
    worker_account_email: row.worker_account_email?.trim() ?? '',
    project_code: row.project_code?.trim() ?? '',
    work_date: row.work_date?.trim() ?? '',
    units_completed: Number(row.units_completed ?? 0),
    hours_worked: Number(row.hours_worked ?? 0)
  }));
};

const fetchWorkerAccounts = async (emails: string[]) => {
  if (emails.length === 0) {
    return new Map<string, WorkerAccountRow>();
  }
  const { data, error } = await supabase
    .from('worker_accounts')
    .select('worker_id, worker_account_email, locale')
    .in('worker_account_email', emails);
  if (error) {
    throw error;
  }
  return new Map((data ?? []).map((row) => [normalizeKey(row.worker_account_email), row as WorkerAccountRow]));
};

const fetchProjects = async (codes: string[]) => {
  if (codes.length === 0) {
    return new Map<string, ProjectRow>();
  }
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_code, locale, rate_card_id');
  if (error) {
    throw error;
  }
  return new Map((data ?? []).map((row) => [normalizeKey(row.project_code), row as ProjectRow]));
};

const fetchLocaleMappings = async () => {
  const { data, error } = await supabase.from('locale_mappings').select('client_locale, iso_locale');
  if (error) {
    throw error;
  }
  return new Map((data ?? []).map((row) => [normalizeKey(row.client_locale), row as LocaleMappingRow]));
};

const fetchRatesPayable = async () => {
  const { data, error } = await supabase.from('rates_payable').select(
    'id, locale, expert_tier, rate_per_unit, rate_per_hour, currency'
  );
  if (error) {
    throw error;
  }
  return data as RatesPayableRow[];
};

const mapLocaleCode = (
  workerLocale: string | null,
  projectLocale: string | null,
  mapping: Map<string, LocaleMappingRow>,
  fallback: string
) => {
  if (workerLocale) {
    const mapped = mapping.get(normalizeKey(workerLocale))?.iso_locale;
    if (mapped) {
      return mapped;
    }
  }
  if (projectLocale) {
    const mapped = mapping.get(normalizeKey(projectLocale))?.iso_locale;
    if (mapped) {
      return mapped;
    }
  }
  return fallback;
};

const calculateEarnings = (
  row: StatsRow,
  worker: WorkerAccountRow | undefined,
  project: ProjectRow | undefined,
  localeMappings: Map<string, LocaleMappingRow>,
  rates: RatesPayableRow[]
) => {
  const locale = mapLocaleCode(worker?.locale ?? null, project?.locale ?? null, localeMappings, DEFAULT_LOCALE);
  const rate = rates.find((entry) => entry.locale === locale && entry.expert_tier === project?.rate_card_id);
  if (!rate) {
    return {
      locale,
      currency: null,
      earnings: null
    };
  }
  const perUnit = Number(rate.rate_per_unit ?? 0);
  const perHour = Number(rate.rate_per_hour ?? 0);
  const earnings =
    perUnit > 0
      ? perUnit * Number(row.units_completed ?? 0)
      : perHour * Number(row.hours_worked ?? 0);
  return {
    locale,
    currency: rate.currency,
    earnings: Number.isFinite(earnings) ? earnings : null
  };
};

const batchInsertWorkStats = async (rows: Database['public']['Tables']['work_stats']['Insert'][]) => {
  if (rows.length === 0) {
    return;
  }
  const { error } = await supabase.from('work_stats').insert(rows);
  if (error) {
    throw error;
  }
};

export const runStatsImport = async ({
  csv,
  defaultLocale = DEFAULT_LOCALE,
  batchSize = DEFAULT_BATCH_SIZE
}: StatsImportOptions): Promise<StatsImportResult> => {
  const parsedRows = parseStatsCsv(csv);
  const validation = await validateStatsRows(parsedRows);
  if (!validation.isValid) {
    return { inserted: 0, skipped: parsedRows.length, validationMessages: validation.messages };
  }

  const uniqueEmails = Array.from(new Set(parsedRows.map((row) => row.worker_account_email)));
  const uniqueProjects = Array.from(new Set(parsedRows.map((row) => row.project_code)));

  const [workerMap, projectMap, localeMappings, rates] = await Promise.all([
    fetchWorkerAccounts(uniqueEmails),
    fetchProjects(uniqueProjects),
    fetchLocaleMappings(),
    fetchRatesPayable()
  ]);

  let inserted = 0;
  let skipped = 0;
  const batch: Database['public']['Tables']['work_stats']['Insert'][] = [];

  for (const row of parsedRows) {
    const worker = workerMap.get(normalizeKey(row.worker_account_email));
    const project = projectMap.get(normalizeKey(row.project_code));
    if (!worker || !project) {
      skipped += 1;
      continue;
    }
    const { locale, currency, earnings } = calculateEarnings(row, worker, project, localeMappings, rates);
    batch.push({
      worker_id: worker.worker_id,
      project_id: project.id,
      work_date: row.work_date,
      units_completed: Number(row.units_completed ?? 0),
      hours_worked: Number(row.hours_worked ?? 0),
      currency,
      locale,
      earnings,
      imported_at: new Date().toISOString()
    });
    if (batch.length >= batchSize) {
      await batchInsertWorkStats(batch.splice(0, batch.length));
      inserted += batchSize;
    }
  }

  if (batch.length > 0) {
    await batchInsertWorkStats(batch);
    inserted += batch.length;
  }

  return {
    inserted,
    skipped,
    validationMessages: validation.messages
  };
};

export default runStatsImport;
