import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type TextFilterMode = 'include' | 'exclude' | 'equals' | 'notEquals';

export interface TextFilterOption {
  id: string;
  label: string;
  count?: number;
  selected?: boolean;
}

export interface TextFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  mode: TextFilterMode;
  onModeChange: (mode: TextFilterMode) => void;
  search: string;
  onSearchChange: (query: string) => void;
  options: TextFilterOption[];
  onToggleOption: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  selectedCount: number;
  totalCount: number;
  includeNull: boolean;
  onIncludeNullChange: (next: boolean) => void;
  onPasteValues: (values: string) => void;
  onApply: () => void;
  isApplyDisabled?: boolean;
  className?: string;
}

const MODE_OPTIONS: Array<{ value: TextFilterMode; label: string }> = [
  { value: 'include', label: 'Include (contains any)' },
  { value: 'exclude', label: 'Exclude (contains any)' },
  { value: 'equals', label: 'Equal to (exact match)' },
  { value: 'notEquals', label: 'Not equal to' }
];

export const TextFilter: React.FC<TextFilterProps> = ({
  open,
  onOpenChange,
  fieldLabel,
  mode,
  onModeChange,
  search,
  onSearchChange,
  options,
  onToggleOption,
  onSelectAll,
  selectedCount,
  totalCount,
  includeNull,
  onIncludeNullChange,
  onPasteValues,
  onApply,
  isApplyDisabled,
  className
}) => {
  const [pastedValues, setPastedValues] = useState('');
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  const handlePasteSubmit = () => {
    if (!pastedValues.trim()) {
      return;
    }
    onPasteValues(pastedValues);
    setPastedValues('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="text-filter-modal" className={cn('sm:max-w-xl space-y-4', className)}>
        <DialogHeader>
          <DialogTitle>Filter: {fieldLabel}</DialogTitle>
          <DialogDescription>
            Choose how to filter by <span className="font-medium text-foreground">{fieldLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Mode</span>
            <Select value={mode} onValueChange={(value) => onModeChange(value as TextFilterMode)}>
              <SelectTrigger data-testid="text-filter-mode">
                <SelectValue placeholder="Select filter mode" />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Search</span>
            <Input
              placeholder="Search values"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">Values</span>
              <Button
                data-testid="text-filter-select-all"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onSelectAll}
              >
                Select all
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedCount} of {totalCount} selected
            </span>
            <ScrollArea className="max-h-[240px] rounded-md border border-border/60">
              <div className="flex flex-col divide-y divide-border/60">
                {filteredOptions.map((option) => (
                  <label
                    key={option.id}
                    data-testid="text-filter-option"
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <Checkbox
                        checked={option.selected}
                        onCheckedChange={(checked) => onToggleOption(option.id, Boolean(checked))}
                      />
                      <span>{option.label}</span>
                    </span>
                    {typeof option.count === 'number' ? (
                      <span className="text-xs text-muted-foreground">{option.count}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Paste comma-separated values
            </span>
            <Textarea
              value={pastedValues}
              onChange={(event) => setPastedValues(event.target.value)}
              placeholder="Value A, Value B, Value C"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePasteSubmit}
                disabled={!pastedValues.trim()}
              >
                Add pasted values
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeNull}
              onCheckedChange={(checked) => onIncludeNullChange(Boolean(checked))}
            />
            <span data-testid="text-filter-include-null">Include records with empty or unknown values</span>
          </label>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="text-filter-apply" onClick={onApply} disabled={isApplyDisabled}>
            Apply filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TextFilter;
