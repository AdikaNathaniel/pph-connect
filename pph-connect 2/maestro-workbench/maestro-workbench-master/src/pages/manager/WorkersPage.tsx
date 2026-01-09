import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { FilterBar, type FilterBarFilter } from '@/components/filters/FilterBar';
import FieldSelectorModal, { type FieldSelectorOption } from '@/components/filters/FieldSelectorModal';
import TextFilter, { type TextFilterMode, type TextFilterOption } from '@/components/filters/TextFilter';
import DateFilter, { type DateFilterOperator } from '@/components/filters/DateFilter';
import { useSearchParams } from 'react-router-dom';
import { useWorkerSearch, type WorkerSearchFilters } from './hooks/useWorkerSearch';
import WorkersTable, { WorkerRow, CLIENT_FILTER_THRESHOLD, DEFAULT_ROWS_PER_PAGE } from './WorkersTable';
import { WorkerForm, type WorkerFormOption } from '@/components/worker/WorkerForm';
import { BulkUploadModal, type BulkImportSummary } from '@/components/worker/BulkUploadModal';
import type { WorkerFormValues } from '@/types/app';
import { useUser } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FILTER_OPTIONS: FieldSelectorOption[] = [
  {
    id: 'status',
    label: 'Status',
    category: 'Worker Profile',
    description: 'Pending, active, inactive, terminated'
  },
  {
    id: 'country',
    label: 'Country',
    category: 'Worker Profile',
    description: 'Workers located in a specific country'
  },
  {
    id: 'locale',
    label: 'Locale',
    category: 'Worker Profile',
    description: 'Preferred locale or language'
  },
  {
    id: 'hire_date',
    label: 'Hire Date',
    category: 'Dates',
    description: 'Hired within a specific date range'
  },
  {
    id: 'bgc_expiration_date',
    label: 'BGC Expiration',
    category: 'Compliance',
    description: 'Background check expiration date'
  }
];

const FILTER_TO_SEARCH_KEY: Record<string, keyof WorkerSearchFilters> = {
  'status': 'statuses',
  'country': 'countries',
  'locale': 'locales'
};

const ENGAGEMENT_MODEL_OPTIONS: WorkerFormOption[] = [
  { value: 'core', label: 'Core' },
  { value: 'upwork', label: 'Upwork' },
  { value: 'external', label: 'External' },
  { value: 'internal', label: 'Internal' }
];

const WORKER_STATUS_OPTIONS: WorkerFormOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' }
];

const COUNTRY_OPTIONS: WorkerFormOption[] = [
  { value: 'US', label: 'United States' },
  { value: 'PH', label: 'Philippines' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'CA', label: 'Canada' }
];

const LOCALE_OPTIONS: WorkerFormOption[] = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'es-ES', label: 'Español (España)' }
];

const buildOptionsForField = (
  fieldId: string,
  rows: WorkerRow[]
): { options: TextFilterOption[]; nullCount: number } => {
  const counts = new Map<string, number>();
  let nullCount = 0;

  rows.forEach((row) => {
    const rawValue = row[fieldId as keyof WorkerRow];
    if (rawValue === null || rawValue === undefined || String(rawValue).trim().length === 0) {
      nullCount += 1;
      return;
    }
    const label = String(rawValue).trim();
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  const options = Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({
      id: label,
      label,
      count,
      selected: false
    }));

  return { options, nullCount };
};

const sanitizeFilterCandidate = (candidate: unknown): FilterBarFilter | null => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const id = record.id;
  const label = record.label;
  const description = record.description;

  if (typeof id !== 'string' || typeof label !== 'string') {
    return null;
  }

  return {
    id,
    label,
    ...(typeof description === 'string' ? { description } : {})
  };
};

const parseFiltersFromSearchParam = (value: string | null): FilterBarFilter[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeFilterCandidate)
      .filter((candidate): candidate is FilterBarFilter => Boolean(candidate));
  } catch {
    return [];
  }
};

const filtersAreEqual = (a: FilterBarFilter[], b: FilterBarFilter[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((filter, index) => {
    const other = b[index];
    if (!other) {
      return false;
    }
    return (
      filter.id === other.id &&
      filter.label === other.label &&
      (filter.description ?? '') === (other.description ?? '')
    );
  });
};

export const WorkersPage: React.FC = () => {
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilters, setActiveFilters] = useState<FilterBarFilter[]>(() =>
    parseFiltersFromSearchParam(searchParams.get('filters'))
  );
  const [appliedFilters, setAppliedFilters] = useState<WorkerSearchFilters>({});
  const [textFilterField, setTextFilterField] = useState<{ id: string; label: string } | null>(null);
  const [textFilterMode, setTextFilterMode] = useState<TextFilterMode>('include');
  const [textFilterSearch, setTextFilterSearch] = useState('');
  const [textFilterOptions, setTextFilterOptions] = useState<TextFilterOption[]>([]);
  const [textFilterIncludeNull, setTextFilterIncludeNull] = useState(false);
  const [showTextFilter, setShowTextFilter] = useState(false);
  const [dateFilterField, setDateFilterField] = useState<{ id: string; label: string } | null>(null);
  const [dateFilterOperator, setDateFilterOperator] = useState<DateFilterOperator>('between');
  const [dateFilterRange, setDateFilterRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const {
    query,
    setQuery,
    clearQuery,
    filters: searchFilters,
    setFilters,
    isSearching,
    error,
    results,
    hasQuery,
    hasActiveFilters,
    refresh
  } = useWorkerSearch();
  const user = useUser();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ROWS_PER_PAGE);
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);
  const [showEditWorker, setShowEditWorker] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editFormValues, setEditFormValues] = useState<WorkerFormValues | null>(null);
  const [isLoadingEditWorker, setIsLoadingEditWorker] = useState(false);
  const [isUpdatingWorker, setIsUpdatingWorker] = useState(false);

  const serverQueryEnabled = !hasQuery && !hasActiveFilters;
  const {
    data: workersQuery,
    isLoading: isWorkersLoading
  } = useWorkers({
    page,
    pageSize,
    enabled: serverQueryEnabled
  });
  const workersData = useMemo(
    () => (workersQuery?.data ?? []) as Array<{
      id: string;
      hr_id: string | null;
      full_name: string | null;
      status: string | null;
      email_personal: string | null;
      email_pph: string | null;
      country_residence: string | null;
      locale_primary: string | null;
      hire_date: string | null;
      bgc_expiration_date: string | null;
    }>,
    [workersQuery?.data]
  );
  const workersCount = workersQuery?.count ?? workersData.length;
  const shouldUseServerPagination =
    serverQueryEnabled && workersCount > CLIENT_FILTER_THRESHOLD;

  useEffect(() => {
    if (!serverQueryEnabled) {
      return;
    }
    if (workersCount > 0 && workersCount <= CLIENT_FILTER_THRESHOLD) {
      const desiredPageSize = Math.min(
        CLIENT_FILTER_THRESHOLD,
        Math.max(DEFAULT_ROWS_PER_PAGE, workersCount)
      );
      if (pageSize !== desiredPageSize) {
        setPageSize(desiredPageSize);
      }
      if (page !== 1) {
        setPage(1);
      }
    }
  }, [page, pageSize, serverQueryEnabled, workersCount]);

  useEffect(() => {
    if (!shouldUseServerPagination) {
      return;
    }
    if (pageSize > CLIENT_FILTER_THRESHOLD) {
      setPageSize(DEFAULT_ROWS_PER_PAGE);
    } else if (pageSize <= 0) {
      setPageSize(DEFAULT_ROWS_PER_PAGE);
    }
  }, [pageSize, shouldUseServerPagination]);

  useEffect(() => {
    if (!shouldUseServerPagination) {
      return;
    }
    const serverTotalPages = Math.max(
      1,
      Math.ceil(workersCount / Math.max(pageSize, 1))
    );
    if (page > serverTotalPages) {
      setPage(serverTotalPages);
    } else if (page < 1) {
      setPage(1);
    }
  }, [page, pageSize, shouldUseServerPagination, workersCount]);

  const normalizeRow = useCallback(
    (record: any): WorkerRow => ({
      id: record.id,
      hr_id: record.hr_id ?? '',
      full_name: record.full_name ?? record.hr_id ?? record.id,
      status: record.status ?? 'pending',
      current_email: record.email_pph ?? record.email_personal ?? record.current_email ?? null,
      country: record.country ?? record.country_residence ?? null,
      locale: record.locale ?? record.locale_primary ?? null,
      hire_date: record.hire_date ?? null,
      bgc_expiration_date: record.bgc_expiration_date ?? null
    }),
    []
  );

  const tableData = useMemo<WorkerRow[]>(() => {
    const source = serverQueryEnabled ? workersData : results;
    return source.map(normalizeRow);
  }, [normalizeRow, results, serverQueryEnabled, workersData]);
  const totalWorkerCount = shouldUseServerPagination ? workersCount : tableData.length;
  const tableIsLoading = shouldUseServerPagination
    ? isWorkersLoading
    : serverQueryEnabled
      ? isWorkersLoading
      : isSearching;
  const workersTableProps = shouldUseServerPagination
    ? {
        page,
        pageSize,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
        totalCount: totalWorkerCount,
        isLoading: tableIsLoading
      }
    : {
        totalCount: totalWorkerCount,
        isLoading: tableIsLoading
      };

  const supervisorOptions = useMemo<WorkerFormOption[]>(() => {
    const unique = new Map<string, string>();
    tableData.forEach((row) => {
      const displayName = row.full_name || row.hr_id || row.id;
      unique.set(row.id, displayName ?? row.id);
    });
    return Array.from(unique.entries()).map(([value, label]) => ({
      value,
      label
    }));
  }, [tableData]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultWorkerInitialValues = useMemo(
    () => ({
      engagementModel: ENGAGEMENT_MODEL_OPTIONS[0]?.value ?? 'core',
      status: WORKER_STATUS_OPTIONS[0]?.value ?? 'pending',
      hireDate: today,
      localePrimary: LOCALE_OPTIONS[0]?.value ?? '',
      localeAll: []
    }),
    [today]
  );
  const resultsCountLabel = `${totalWorkerCount} worker${totalWorkerCount === 1 ? '' : 's'}`;

  const filterOptions = useMemo<FieldSelectorOption[]>(
    () =>
      FILTER_OPTIONS.map((option) => ({
        ...option,
        disabled: activeFilters.some((filter) => filter.id === option.id)
      })),
    [activeFilters]
  );

  const handleAddFilter = useCallback(() => {
    setShowFieldSelector(true);
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    setAppliedFilters({});
  }, [setAppliedFilters]);

  const handleRemoveFilter = useCallback((filterId: string) => {
    setActiveFilters((current) => current.filter((filter) => filter.id !== filterId));
    const keyToRemove = FILTER_TO_SEARCH_KEY[filterId];
    if (!keyToRemove) {
      return;
    }
    setAppliedFilters((current) => {
      if (!(keyToRemove in current)) {
        return current;
      }
      const next = { ...current };
      delete next[keyToRemove];
      return next;
    });
  }, [setAppliedFilters]);

  const handleCreateWorker = useCallback(
    async (values: WorkerFormValues) => {
      const currentUserId = user?.id ?? null;
      setIsCreatingWorker(true);
      const timestamp = new Date().toISOString();

      try {
        const { error } = await supabase.from('workers').insert([
          {
            hr_id: values.hrId,
            full_name: values.fullName,
            engagement_model: values.engagementModel,
            worker_role: values.workerRole ?? null,
            email_personal: values.emailPersonal,
            email_pph: values.emailPph ?? null,
            country_residence: values.countryResidence,
            locale_primary: values.localePrimary,
            locale_all: values.localeAll,
            hire_date: values.hireDate,
            rtw_datetime: values.rtwDateTime ?? null,
            supervisor_id: values.supervisorId ?? null,
            termination_date: values.terminationDate ?? null,
            bgc_expiration_date: values.bgcExpirationDate ?? null,
            status: values.status,
            created_by: currentUserId,
            created_at: timestamp,
            updated_at: timestamp,
            updated_by: currentUserId
          }
        ]);

        if (error) {
          throw new Error(error.message);
        }

        toast.success('Worker created', {
          description: `${values.fullName} has been added to the workforce directory.`
        });
        setShowAddWorker(false);
        refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to create worker right now.';
        toast.error('Unable to create worker', { description: message });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        setIsCreatingWorker(false);
      }
    },
    [refresh, setShowAddWorker, user]
  );

  const handleBulkImport = useCallback(
    async (rows: WorkerFormValues[]): Promise<BulkImportSummary> => {
      const currentUserId = user?.id ?? null;
      const timestamp = new Date().toISOString();
      const summary: BulkImportSummary = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: []
      };

      for (let index = 0; index < rows.length; index += 20) {
        const chunk = rows.slice(index, index + 20);
        const payload = chunk.map((row) => ({
          hr_id: row.hrId,
          full_name: row.fullName,
          engagement_model: row.engagementModel,
          worker_role: row.workerRole,
          email_personal: row.emailPersonal,
          email_pph: row.emailPph,
          country_residence: row.countryResidence,
          locale_primary: row.localePrimary,
          locale_all: row.localeAll,
          hire_date: row.hireDate,
          rtw_datetime: row.rtwDateTime,
          supervisor_id: row.supervisorId,
          termination_date: row.terminationDate,
          bgc_expiration_date: row.bgcExpirationDate,
          status: row.status,
          created_by: currentUserId,
          created_at: timestamp,
          updated_by: currentUserId,
          updated_at: timestamp
        }));

        const { error } = await supabase.from('workers').insert(payload);
        if (error) {
          summary.failed += payload.length;
          summary.errors.push({
            row: index + 2,
            message: error.message
          });
        } else {
          summary.success += payload.length;
        }
      }

      return summary;
    },
    [user]
  );

  const handleBulkImportComplete = useCallback(
    (summary: BulkImportSummary) => {
      if (summary.success > 0) {
        toast.success('Bulk import completed', {
          description: `${summary.success} worker${summary.success === 1 ? '' : 's'} imported successfully.`
        });
      }
      if (summary.failed > 0) {
        toast.error('Some workers could not be imported', {
          description: `${summary.failed} row${summary.failed === 1 ? '' : 's'} require attention.`
        });
      }
      refresh();
    },
    [refresh]
  );

  const handleCloseEditWorker = useCallback(() => {
    setShowEditWorker(false);
    setEditingWorkerId(null);
    setEditFormValues(null);
    setIsLoadingEditWorker(false);
    setIsUpdatingWorker(false);
  }, []);

  const handleOpenEditWorker = useCallback(
    async (worker: WorkerRow) => {
      setShowEditWorker(true);
      setEditingWorkerId(worker.id);
      setIsLoadingEditWorker(true);
      setEditFormValues(null);

      try {
        const { data, error } = await supabase
          .from('workers')
          .select('hr_id, full_name, engagement_model, worker_role, email_personal, email_pph, country_residence, locale_primary, locale_all, hire_date, rtw_datetime, supervisor_id, termination_date, bgc_expiration_date, status')
          .eq('id', worker.id).single();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error('Worker not found');
        }
        data.hr_id = data.hr_id ?? '';
        data.full_name = data.full_name ?? '';
        data.engagement_model =
          data.engagement_model ?? ENGAGEMENT_MODEL_OPTIONS[0]?.value ?? 'core';
        data.worker_role = data.worker_role ?? null;
        data.email_personal = data.email_personal ?? '';
        data.email_pph = data.email_pph ?? null;
        data.country_residence = data.country_residence ?? '';
        data.locale_primary = data.locale_primary ?? '';
        data.locale_all = Array.isArray(data.locale_all) ? data.locale_all : [];
        data.hire_date = data.hire_date ?? '';
        data.rtw_datetime = data.rtw_datetime ?? null;
        data.supervisor_id = data.supervisor_id ?? null;
        data.termination_date = data.termination_date ?? null;
        data.bgc_expiration_date = data.bgc_expiration_date ?? null;
        data.status = data.status ?? WORKER_STATUS_OPTIONS[0]?.value ?? 'pending';

        setEditFormValues({ hrId: data.hr_id, fullName: data.full_name, engagementModel: data.engagement_model, workerRole: data.worker_role, emailPersonal: data.email_personal, emailPph: data.email_pph, countryResidence: data.country_residence, localePrimary: data.locale_primary, localeAll: data.locale_all, hireDate: data.hire_date, rtwDateTime: data.rtw_datetime, supervisorId: data.supervisor_id, terminationDate: data.termination_date, bgcExpirationDate: data.bgc_expiration_date, status: data.status });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load worker details.';
        toast.error('Unable to load worker', { description: message });
        handleCloseEditWorker();
      } finally {
        setIsLoadingEditWorker(false);
      }
    },
    [handleCloseEditWorker]
  );

  const handleUpdateWorker = useCallback(
    async (values: WorkerFormValues) => {
      if (!editingWorkerId) {
        return;
      }
      setIsUpdatingWorker(true);
      const timestamp = new Date().toISOString();
      const currentUserId = user?.id ?? null;

      try {
        const { error } = await supabase
          .from('workers')
          .update({
            hr_id: values.hrId,
            full_name: values.fullName,
            engagement_model: values.engagementModel,
            worker_role: values.workerRole ?? null,
            email_personal: values.emailPersonal,
            email_pph: values.emailPph ?? null,
            country_residence: values.countryResidence,
            locale_primary: values.localePrimary,
            locale_all: values.localeAll,
            hire_date: values.hireDate,
            rtw_datetime: values.rtwDateTime ?? null,
            supervisor_id: values.supervisorId ?? null,
            termination_date: values.terminationDate ?? null,
            bgc_expiration_date: values.bgcExpirationDate ?? null,
            status: values.status,
            updated_by: currentUserId,
            updated_at: timestamp
          })
          .eq('id', editingWorkerId);

        if (error) {
          throw new Error(error.message);
        }

        toast.success('Worker updated', {
          description: `${values.fullName} has been updated.`
        });
        refresh();
        handleCloseEditWorker();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to update worker right now.';
        toast.error('Unable to update worker', { description: message });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        setIsUpdatingWorker(false);
      }
    },
    [editingWorkerId, handleCloseEditWorker, refresh, user]
  );

  useEffect(() => {
    const parsedFilters = parseFiltersFromSearchParam(searchParams.get('filters'));
    setActiveFilters((current) =>
      filtersAreEqual(current, parsedFilters) ? current : parsedFilters
    );
  }, [searchParams]);

  useEffect(() => {
    const serialized = activeFilters.length ? JSON.stringify(activeFilters) : null;
    const rawValue = searchParams.get('filters');
    const currentValue = rawValue && rawValue.length > 0 ? rawValue : null;

    if ((serialized ?? '') === (currentValue ?? '')) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (serialized) {
      next.set('filters', serialized);
    } else {
      next.delete('filters');
    }

    setSearchParams(next, { replace: true });
  }, [activeFilters, searchParams, setSearchParams]);

  useEffect(() => {
    setFilters(appliedFilters);
  }, [appliedFilters, setFilters]);

  const openTextFilterForField = useCallback(
    (fieldId: string, fieldLabel: string) => {
      const { options, nullCount } = buildOptionsForField(fieldId, tableData);
      const key = FILTER_TO_SEARCH_KEY[fieldId];
      const activeValues = key ? appliedFilters[key] ?? [] : [];
      const normalizedActive = new Map(
        activeValues.map((value) => [value.toLowerCase(), value])
      );
      const normalizedOptions = options.map((option) => {
        const isSelected = normalizedActive.has(option.id.toLowerCase());
        if (isSelected) {
          normalizedActive.delete(option.id.toLowerCase());
        }
        return {
          ...option,
          selected: isSelected
        };
      });
      const missingValues = Array.from(normalizedActive.values()).map((value) => ({
        id: value,
        label: value,
        selected: true
      }));

      setTextFilterField({ id: fieldId, label: fieldLabel });
      setTextFilterMode('include');
      setTextFilterSearch('');
      setTextFilterOptions([...normalizedOptions, ...missingValues]);
      setTextFilterIncludeNull(false);
      if (nullCount === 0) {
        setTextFilterIncludeNull(false);
      }
      setShowTextFilter(true);
    },
    [appliedFilters, tableData]
  );

  const handleFieldSelect = useCallback(
    (option: FieldSelectorOption) => {
      setShowFieldSelector(false);
      const dateFields = new Set(['hire_date', 'bgc_expiration_date']);
      if (dateFields.has(option.id)) {
        setDateFilterField({ id: option.id, label: option.label });
        setDateFilterOperator('between');
        setDateFilterRange({ start: null, end: null });
        setShowDateFilter(true);
        return;
      }
      openTextFilterForField(option.id, option.label);
    },
    [openTextFilterForField]
  );

  const handleFilterClick = useCallback(
    (filterId: string) => {
      const option = FILTER_OPTIONS.find((candidate) => candidate.id === filterId);
      if (!option) {
        return;
      }
      openTextFilterForField(option.id, option.label);
    },
    [openTextFilterForField]
  );

  const handleToggleTextOption = useCallback((id: string, selected: boolean) => {
    setTextFilterOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, selected } : option))
    );
  }, []);

  const handleSelectAllOptions = useCallback(() => {
    setTextFilterOptions((current) => current.map((option) => ({ ...option, selected: true })));
  }, []);

  const handlePasteValues = useCallback((raw: string) => {
    const values = raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length === 0) {
      return;
    }
    setTextFilterOptions((current) => {
      const map = new Map(current.map((option) => [option.id.toLowerCase(), option]));
      const next = [...current];
      values.forEach((value) => {
        const existing = map.get(value.toLowerCase());
        if (existing) {
          existing.selected = true;
        } else {
          next.push({ id: value, label: value, selected: true });
        }
      });
      return next;
    });
  }, []);

  const handleTextFilterApply = useCallback(() => {
    if (!textFilterField) {
      return;
    }
    const selected = textFilterOptions.filter((option) => option.selected);
    const summaryParts: string[] = [];
    if (selected.length > 0) {
      summaryParts.push(`${selected.length} value${selected.length === 1 ? '' : 's'} selected`);
    }
    if (textFilterIncludeNull) {
      summaryParts.push('including empty values');
    }
    const description = summaryParts.length > 0 ? summaryParts.join(', ') : 'No values selected';

    setActiveFilters((current) => {
      const remaining = current.filter((filter) => filter.id !== textFilterField.id);
      remaining.push({ id: textFilterField.id, label: textFilterField.label, description });
      return remaining;
    });

    const key = FILTER_TO_SEARCH_KEY[textFilterField.id];
    if (key) {
      const selectedIds = Array.from(new Set(selected.map((option) => option.id)));
      setAppliedFilters((current) => {
        const next = { ...current };
        if (selectedIds.length === 0) {
          delete next[key];
        } else {
          next[key] = selectedIds;
        }
        return next;
      });
    }

    setShowTextFilter(false);
    setTextFilterField(null);
  }, [setAppliedFilters, textFilterField, textFilterIncludeNull, textFilterOptions]);

  const buildPresetRange = (presetId: string) => {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    switch (presetId) {
      case 'today':
        return { start: today, end: today };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        return { start, end };
      case 'last7':
        start.setDate(start.getDate() - 6);
        return { start, end };
      case 'thisMonth':
        start.setDate(1);
        return { start, end };
      case 'lastMonth': {
        const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastOfLastMonth = new Date(firstOfThisMonth);
        lastOfLastMonth.setDate(lastOfLastMonth.getDate() - 1);
        return {
          start: new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1),
          end: lastOfLastMonth
        };
      }
      default:
        return { start: today, end: today };
    }
  };

  const datePresets = useMemo(() => {
    const today = new Date();
    return [
      { id: 'today', label: 'Today', range: { start: today, end: today } },
      { id: 'yesterday', label: 'Yesterday', range: buildPresetRange('yesterday') },
      { id: 'last7', label: 'Last 7 days', range: buildPresetRange('last7') },
      { id: 'thisMonth', label: 'This month', range: buildPresetRange('thisMonth') },
      { id: 'lastMonth', label: 'Last month', range: buildPresetRange('lastMonth') }
    ];
  }, []);

  const handleDatePreset = useCallback(
    (presetId: string) => {
      const preset = datePresets.find((candidate) => candidate.id === presetId);
      if (!preset) {
        return;
      }
      setDateFilterRange({
        start: preset.range.start,
        end: preset.range.end
      });
    },
    [datePresets]
  );

  const handleDateApply = useCallback(() => {
    if (!dateFilterField) {
      return;
    }
    const start = dateFilterRange.start
      ? dateFilterRange.start.toLocaleDateString()
      : '—';
    const end = dateFilterRange.end ? dateFilterRange.end.toLocaleDateString() : '—';
    setActiveFilters((current) => {
      const remaining = current.filter((filter) => filter.id !== dateFilterField.id);
      remaining.push({
        id: dateFilterField.id,
        label: dateFilterField.label,
        description: `${start} → ${end}`
      });
      return remaining;
    });
    setShowDateFilter(false);
    setDateFilterField(null);
  }, [dateFilterField, dateFilterRange]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workers</h1>
            <p className="text-sm text-muted-foreground">
              Track onboarding progress, assignments, and engagement health across your workforce.
            </p>
          </div>
          <Badge data-testid="worker-count" variant="secondary" className="text-xs">
            {resultsCountLabel}
          </Badge>
        </div>
      </header>

      <section
        data-testid="workers-search"
        className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search workers"
            value={query}
            onChange={handleSearchChange}
            className="flex-1 min-w-[220px] md:max-w-md"
          />
          {hasQuery && (
            <Button data-testid="clear-search" variant="ghost" size="sm" onClick={clearQuery}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground md:text-sm">
          {serverQueryEnabled ? (
            tableIsLoading ? (
              <span className="flex items-center gap-2 text-primary" data-testid="workers-loading-indicator">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading workers…
              </span>
            ) : (
              <span data-testid="search-results-count">
                {`${totalWorkerCount} total worker${totalWorkerCount === 1 ? '' : 's'}`}
              </span>
            )
          ) : isSearching ? (
            <span className="flex items-center gap-2 text-primary" data-testid="searching-indicator">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </span>
          ) : (
            <span data-testid="search-results-count">
              {hasQuery
                ? `${results.length} match${results.length === 1 ? '' : 'es'}`
                : hasActiveFilters
                  ? `${results.length} filtered result${results.length === 1 ? '' : 's'}`
                  : 'Enter a query or add filters to search workers.'}
            </span>
          )}
          {error && (
            <span className="text-destructive" role="alert">
              {error}
            </span>
          )}
        </div>
      </section>

      <section
        data-testid="workers-actions"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-4"
      >
        <div className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground md:text-sm">
          <span className="font-medium text-foreground">Quick actions</span>
          <span>Use the controls on the right to add, import, or manage worker records.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulkUpload(true)}>
            Bulk Upload
          </Button>
          <Button size="sm" onClick={() => setShowAddWorker(true)}>
            Add Worker
          </Button>
        </div>
      </section>

      <FilterBar
        filters={activeFilters}
        onAddFilter={handleAddFilter}
        onClearAll={handleClearFilters}
        onRemoveFilter={handleRemoveFilter}
        onFilterClick={handleFilterClick}
      />

      <WorkersTable
        data={tableData}
        filters={searchFilters}
        {...workersTableProps}
        onEditWorker={handleOpenEditWorker}
      />

      <BulkUploadModal
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onImportRows={handleBulkImport}
        onImportComplete={handleBulkImportComplete}
      />

      <Dialog open={showAddWorker} onOpenChange={setShowAddWorker}>
        <DialogContent data-testid="add-worker-dialog">
          <DialogHeader>
            <DialogTitle>Add worker</DialogTitle>
            <DialogDescription>
              Capture core profile information to start onboarding. Additional details can be added later.
            </DialogDescription>
          </DialogHeader>
          <WorkerForm
            initialValues={defaultWorkerInitialValues}
            mode="create"
            engagementModels={ENGAGEMENT_MODEL_OPTIONS}
            statuses={WORKER_STATUS_OPTIONS}
            countries={COUNTRY_OPTIONS}
            locales={LOCALE_OPTIONS}
            supervisors={supervisorOptions}
            onSubmit={handleCreateWorker}
            onCancel={() => setShowAddWorker(false)}
            isSubmitting={isCreatingWorker}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditWorker}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditWorker();
          }
        }}
      >
        <DialogContent data-testid="edit-worker-dialog">
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>
              Update worker profile information and maintain accurate records.
            </DialogDescription>
          </DialogHeader>
          {isLoadingEditWorker || !editFormValues ? (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading worker information…</span>
            </div>
          ) : (
            <WorkerForm
              mode="update"
              initialValues={editFormValues}
              engagementModels={ENGAGEMENT_MODEL_OPTIONS}
              statuses={WORKER_STATUS_OPTIONS}
              countries={COUNTRY_OPTIONS}
              locales={LOCALE_OPTIONS}
              supervisors={supervisorOptions}
              onSubmit={handleUpdateWorker}
              onCancel={handleCloseEditWorker}
              isSubmitting={isUpdatingWorker}
              currentWorkerId={editingWorkerId ?? undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      <FieldSelectorModal
        open={showFieldSelector}
        onOpenChange={setShowFieldSelector}
        options={filterOptions}
        onOptionSelect={handleFieldSelect}
      />

      <TextFilter
        open={showTextFilter}
        onOpenChange={setShowTextFilter}
        fieldLabel={textFilterField?.label ?? 'Field'}
        mode={textFilterMode}
        onModeChange={setTextFilterMode}
        search={textFilterSearch}
        onSearchChange={setTextFilterSearch}
        options={textFilterOptions}
        onToggleOption={handleToggleTextOption}
        onSelectAll={handleSelectAllOptions}
        selectedCount={textFilterOptions.filter((option) => option.selected).length}
        totalCount={textFilterOptions.length}
        includeNull={textFilterIncludeNull}
        onIncludeNullChange={setTextFilterIncludeNull}
        onPasteValues={handlePasteValues}
        onApply={handleTextFilterApply}
        isApplyDisabled={
          textFilterOptions.every((option) => !option.selected) && !textFilterIncludeNull
        }
      />

      <DateFilter
        open={showDateFilter}
        onOpenChange={setShowDateFilter}
        fieldLabel={dateFilterField?.label ?? 'Date'}
        operator={dateFilterOperator}
        onOperatorChange={setDateFilterOperator}
        selectedRange={dateFilterRange}
        onRangeChange={setDateFilterRange}
        presets={datePresets}
        onPresetSelect={handleDatePreset}
        onApply={handleDateApply}
        isApplyDisabled={!dateFilterRange.start || !dateFilterRange.end}
      />
    </div>
  );
};

export default WorkersPage;
