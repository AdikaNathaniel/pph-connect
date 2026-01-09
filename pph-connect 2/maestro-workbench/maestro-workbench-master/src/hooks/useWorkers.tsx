import { useQuery } from '@tanstack/react-query';
import supabase from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type WorkerRow = Database['public']['Tables']['workers']['Row'];

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;

const normalizeValues = (values?: string[]) =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

export interface WorkersQueryFilters {
  statuses?: string[];
  countries?: string[];
  locales?: string[];
}

export interface UseWorkersOptions {
  page?: number;
  pageSize?: number;
  filters?: WorkersQueryFilters;
  enabled?: boolean;
}

export interface WorkersQueryResult {
  data: WorkerRow[];
  count: number;
}

const fetchWorkers = async (options: UseWorkersOptions = {}): Promise<WorkersQueryResult> => {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};

  let query = supabase
    .from('workers')
    .select(
      [
        'id',
        'hr_id',
        'full_name',
        'status',
        'email_personal',
        'email_pph',
        'country_residence',
        'locale_primary',
        'hire_date',
        'bgc_expiration_date'
      ].join(', '),
      { count: 'exact' }
    );

  const statuses = normalizeValues(filters.statuses);
  const countries = normalizeValues(filters.countries);
  const locales = normalizeValues(filters.locales);

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }
  if (countries.length > 0) {
    query = query.in('country_residence', countries);
  }
  if (locales.length > 0) {
    query = query.in('locale_primary', locales);
  }

  const { data, error, count } = await query.order('full_name', { ascending: true }).range(from, to);

  if (error) {
    throw error;
  }

  return {
    data: (data ?? []) as WorkerRow[],
    count: count ?? 0
  };
};

export const useWorkers = (options: UseWorkersOptions = {}) => {
  const { enabled = true, ...queryOptions } = options;
  const keyPayload = {
    page: queryOptions.page ?? 1,
    pageSize: queryOptions.pageSize ?? DEFAULT_PAGE_SIZE,
    filters: queryOptions.filters ?? {}
  };

  return useQuery({
    queryKey: ['workers', keyPayload],
    queryFn: () => fetchWorkers(queryOptions),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    enabled
  });
};

export default useWorkers;
