import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type DateFilterOperator = 'between' | 'equal' | 'notEqual' | 'before' | 'after';

export interface DateFilterPreset {
  id: string;
  label: string;
  range: { start: Date; end: Date };
}

export interface DateFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  operator: DateFilterOperator;
  onOperatorChange: (operator: DateFilterOperator) => void;
  selectedRange: { start: Date | null; end: Date | null };
  onRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  presets: DateFilterPreset[];
  onPresetSelect: (presetId: string) => void;
  onApply: () => void;
  isApplyDisabled?: boolean;
  className?: string;
}

const OPERATOR_OPTIONS: Array<{ value: DateFilterOperator; label: string }> = [
  { value: 'between', label: 'Between' },
  { value: 'equal', label: 'Equal to' },
  { value: 'notEqual', label: 'Not equal to' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' }
];

const formatRangeLabel = (range: { start: Date | null; end: Date | null }) => {
  const start = range.start ? range.start.toLocaleDateString() : '—';
  const end = range.end ? range.end.toLocaleDateString() : '—';
  return `${start} → ${end}`;
};

export const DateFilter: React.FC<DateFilterProps> = ({
  open,
  onOpenChange,
  fieldLabel,
  operator,
  onOperatorChange,
  selectedRange,
  onRangeChange,
  presets,
  onPresetSelect,
  onApply,
  isApplyDisabled,
  className
}) => {
  const rangeSummary = useMemo(() => formatRangeLabel(selectedRange), [selectedRange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="date-filter-modal" className={cn('sm:max-w-xl space-y-4', className)}>
        <DialogHeader>
          <DialogTitle>Filter: {fieldLabel}</DialogTitle>
          <DialogDescription>
            Select a date range to filter <span className="font-medium text-foreground">{fieldLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Operator</span>
            <Select value={operator} onValueChange={(value) => onOperatorChange(value as DateFilterOperator)}>
              <SelectTrigger data-testid="date-filter-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {OPERATOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Quick presets</span>
            <div data-testid="date-filter-presets" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onPresetSelect(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Selected range</span>
            <span className="text-sm text-muted-foreground">{rangeSummary}</span>
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{ from: selectedRange.start ?? undefined, to: selectedRange.end ?? undefined }}
              onSelect={(range) =>
                onRangeChange({
                  start: range?.from ?? null,
                  end: range?.to ?? null
                })
              }
            />
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="date-filter-apply" onClick={onApply} disabled={isApplyDisabled}>
            Apply filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DateFilter;
