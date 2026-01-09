import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const resultsLimit = 25;
const SEARCH_COLUMNS =
  'id, full_name, hr_id, status, email_personal, email_pph, country, locale, hire_date, bgc_expiration_date';
const DEBOUNCE_MS = 300;

const escapeIlike = (value: string) => value.replace(/[%_']/g, (match) => `\\${match}`);

const normalizeFilterValues = (values?: string[]) =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

export interface WorkerSearchFilters {
  statuses?: string[];
  countries?: string[];
  locales?: string[];
}

export interface WorkerSearchResult {
  id: string;
  full_name: string;
  hr_id: string;
  status?: string | null;
  email_personal: string | null;
  email_pph: string | null;
  country?: string | null;
  locale?: string | null;
  hire_date?: string | null;
  bgc_expiration_date?: string | null;
}

export interface WorkerSearchState {
  query: string;
  setQuery: (next: string) => void;
  clearQuery: () => void;
  filters: WorkerSearchFilters;
  setFilters: (next: WorkerSearchFilters) => void;
  isSearching: boolean;
  error: string | null;
  results: WorkerSearchResult[];
  hasQuery: boolean;
  hasActiveFilters: boolean;
  refresh: () => void;
}

export const useWorkerSearch = (): WorkerSearchState => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<WorkerSearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WorkerSearchResult[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const normalizedFilters = useMemo(
    () => ({
      statuses: normalizeFilterValues(filters.statuses),
      countries: normalizeFilterValues(filters.countries),
      locales: normalizeFilterValues(filters.locales)
    }),
    [filters]
  );

  const hasActiveFilters = useMemo(
    () =>
      normalizedFilters.statuses.length > 0 ||
      normalizedFilters.countries.length > 0 ||
      normalizedFilters.locales.length > 0,
    [normalizedFilters]
  );

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery && !hasActiveFilters) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const sanitized = debouncedQuery ? escapeIlike(debouncedQuery) : null;
    const searchFilter = sanitized
      ? [
          `full_name.ilike.%${sanitized}%`,
          `hr_id.ilike.%${sanitized}%`,
          `email_personal.ilike.%${sanitized}%`,
          `email_pph.ilike.%${sanitized}%`
        ].join(',')
      : null;

    let queryBuilder = supabase.from('workers').select(SEARCH_COLUMNS);

    if (searchFilter) {
      queryBuilder = queryBuilder.or(searchFilter);
    }
    if (normalizedFilters.statuses.length > 0) {
      queryBuilder = queryBuilder.in('status', normalizedFilters.statuses);
    }
    if (normalizedFilters.countries.length > 0) {
      queryBuilder = queryBuilder.in('country', normalizedFilters.countries);
    }
    if (normalizedFilters.locales.length > 0) {
      queryBuilder = queryBuilder.in('locale', normalizedFilters.locales);
    }

    let isActive = true;
    setIsSearching(true);
    setError(null);

    queryBuilder
      .order('full_name', { ascending: true })
      .limit(resultsLimit)
      .then(({ data, error: queryError }) => {
        if (!isActive) {
          return;
        }
        if (queryError) {
          setError(queryError.message);
          setResults([]);
          return;
        }
        setResults((data ?? []) as WorkerSearchResult[]);
      })
      .catch((unexpected) => {
        if (!isActive) {
          return;
        }
        const message =
          unexpected instanceof Error ? unexpected.message : 'Unable to search workers right now.';
        setError(message);
        setResults([]);
      })
      .finally(() => {
        if (isActive) {
          setIsSearching(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, hasActiveFilters, normalizedFilters, refreshCounter]);

  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const hasQuery = useMemo(() => debouncedQuery.length > 0, [debouncedQuery]);
  const refresh = useCallback(() => {
    setRefreshCounter((counter) => counter + 1);
  }, []);

  return {
    query,
    setQuery,
    clearQuery,
    filters,
    setFilters,
    isSearching,
    error,
    results,
    hasQuery,
    hasActiveFilters,
    refresh
  };
};
