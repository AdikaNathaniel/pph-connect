import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ActiveFilterChip from '@/components/filters/ActiveFilterChip';
import { cn } from '@/lib/utils';

export interface FilterBarFilter {
  id: string;
  label: string;
  description?: string;
}

export interface FilterBarProps {
  filters: FilterBarFilter[];
  onAddFilter: () => void;
  onClearAll: () => void;
  onRemoveFilter: (id: string) => void;
  onFilterClick?: (id: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onAddFilter,
  onClearAll,
  onRemoveFilter,
  onFilterClick,
  className
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button data-testid="filterbar-add" size="sm" onClick={onAddFilter}>
          Add Filter
        </Button>
        <Button
          data-testid="filterbar-clear"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={filters.length === 0}
        >
          Clear All
        </Button>
        <Badge
          data-testid="filterbar-count"
          variant="secondary"
          className="rounded-full px-2 py-0.5 text-xs"
        >
          {filters.length} {filters.length === 1 ? 'filter' : 'filters'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <ActiveFilterChip
            key={filter.id}
            label={filter.label}
            description={filter.description}
            onClick={() => onFilterClick?.(filter.id)}
            onRemove={() => onRemoveFilter(filter.id)}
          />
        ))}
        {filters.length === 0 ? (
          <span className="text-sm text-muted-foreground">No filters applied.</span>
        ) : null}
      </div>
    </div>
  );
};

export default FilterBar;
