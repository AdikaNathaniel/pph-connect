import { useCallback, useMemo, useState } from 'react';
import { TextFilterMode } from '@/components/filters/TextFilter';
import { NumberFilterOperator } from '@/components/filters/NumberFilter';
import { DateFilterOperator } from '@/components/filters/DateFilter';

export type FilterKind = 'text' | 'number' | 'date';

export interface BaseFilterDefinition {
  id: string;
  fieldId: string;
  label: string;
  kind: FilterKind;
}

export interface TextFilterDefinition extends BaseFilterDefinition {
  kind: 'text';
  mode: TextFilterMode;
  values: string[];
  includeNull: boolean;
}

export interface NumberFilterDefinition extends BaseFilterDefinition {
  kind: 'number';
  operator: NumberFilterOperator;
  value: number | null;
  secondaryValue?: number | null;
}

export interface DateFilterDefinition extends BaseFilterDefinition {
  kind: 'date';
  operator: DateFilterOperator;
  startDate: string | null;
  endDate: string | null;
}

export type FilterDefinition = TextFilterDefinition | NumberFilterDefinition | DateFilterDefinition;

export interface UseFilterState {
  filters: FilterDefinition[];
  addFilter: (definition: FilterDefinition) => void;
  updateFilter: (id: string, definition: Partial<FilterDefinition>) => void;
  removeFilter: (id: string) => void;
  buildSupabaseQuery: () => string[];
}

const textFilterToSupabase = (filter: TextFilterDefinition): string | null => {
  if (!filter.values.length && !filter.includeNull) {
    return null;
  }

  const column = filter.fieldId;
  const escapedValues = filter.values.map((value) => `'${value.replace(/'/g, "''")}'`);

  switch (filter.mode) {
    case 'include':
      return `${column}.in.(${escapedValues.join(',')})${filter.includeNull ? `,${column}.is.null` : ''}`;
    case 'exclude':
      return `${column}.not.in.(${escapedValues.join(',')})${filter.includeNull ? `,${column}.not.is.null` : ''}`;
    case 'equals':
      return `${column}.eq.${escapedValues[0] ?? "''"}`;
    case 'notEquals':
      return `${column}.neq.${escapedValues[0] ?? "''"}`;
    default:
      return null;
  }
};

const numberFilterToSupabase = (filter: NumberFilterDefinition): string | null => {
  const column = filter.fieldId;
  const value = filter.value ?? null;
  const secondary = filter.secondaryValue ?? null;

  if (value === null && secondary === null) {
    return null;
  }

  switch (filter.operator) {
    case 'equal':
      return `${column}.eq.${value}`;
    case 'notEqual':
      return `${column}.neq.${value}`;
    case 'greaterThan':
      return `${column}.gt.${value}`;
    case 'greaterThanOrEqual':
      return `${column}.gte.${value}`;
    case 'lessThan':
      return `${column}.lt.${value}`;
    case 'lessThanOrEqual':
      return `${column}.lte.${value}`;
    case 'between':
      return `${column}.gte.${value}.and.${column}.lte.${secondary}`;
    case 'notBetween':
      return `${column}.lt.${value}.or.${column}.gt.${secondary}`;
    default:
      return null;
  }
};

const dateFilterToSupabase = (filter: DateFilterDefinition): string | null => {
  const column = filter.fieldId;
  const { startDate, endDate, operator } = filter;

  switch (operator) {
    case 'between':
      return `${column}.gte.${startDate ?? ''}.and.${column}.lte.${endDate ?? ''}`;
    case 'equal':
      return `${column}.eq.${startDate ?? ''}`;
    case 'notEqual':
      return `${column}.neq.${startDate ?? ''}`;
    case 'before':
      return `${column}.lt.${startDate ?? ''}`;
    case 'after':
      return `${column}.gt.${startDate ?? ''}`;
    default:
      return null;
  }
};

export const useFilterState = (): UseFilterState => {
  const [filters, setFilters] = useState<FilterDefinition[]>([]);

  const addFilter = useCallback((definition: FilterDefinition) => {
    setFilters((current) => {
      const exists = current.some((filter) => filter.id === definition.id);
      return exists ? current : [...current, definition];
    });
  }, []);

  const updateFilter = useCallback((id: string, definition: Partial<FilterDefinition>) => {
    setFilters((current) =>
      current.map((filter) => (filter.id === id ? { ...filter, ...definition } as FilterDefinition : filter))
    );
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((current) => current.filter((filter) => filter.id !== id));
  }, []);

  const buildSupabaseQuery = useCallback(() => {
    return filters
      .map((filter) => {
        switch (filter.kind) {
          case 'text':
            return textFilterToSupabase(filter);
          case 'number':
            return numberFilterToSupabase(filter);
          case 'date':
            return dateFilterToSupabase(filter);
          default:
            return null;
        }
      })
      .filter((clause): clause is string => Boolean(clause));
  }, [filters]);

  const value = useMemo<UseFilterState>(
    () => ({ filters, addFilter, updateFilter, removeFilter, buildSupabaseQuery }),
    [filters, addFilter, updateFilter, removeFilter, buildSupabaseQuery]
  );

  return value;
};

export { textFilterToSupabase, numberFilterToSupabase, dateFilterToSupabase };
