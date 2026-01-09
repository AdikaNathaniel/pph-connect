import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FieldSelectorOption {
  id: string;
  label: string;
  category?: string;
  description?: string;
  disabled?: boolean;
}

export interface FieldSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: FieldSelectorOption[];
  onOptionSelect: (option: FieldSelectorOption) => void;
  className?: string;
}

const groupByCategory = (options: FieldSelectorOption[]) => {
  const map = new Map<string, FieldSelectorOption[]>();
  options.forEach((option) => {
    const category = option.category ?? 'Other';
    const group = map.get(category);
    if (group) {
      group.push(option);
    } else {
      map.set(category, [option]);
    }
  });
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
};

export const FieldSelectorModal: React.FC<FieldSelectorModalProps> = ({
  open,
  onOpenChange,
  options,
  onOptionSelect,
  className
}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query) ||
        option.category?.toLowerCase().includes(query)
    );
  }, [options, search]);

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);
  const hasOptions = filtered.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="field-selector-modal" className={cn('sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>Select a field</DialogTitle>
          <DialogDescription>
            Choose a field to add a new filter. You can search by field name or category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fields"
          />
          <ScrollArea className="max-h-[360px] rounded-md border border-border/60">
            <div className="flex flex-col divide-y divide-border/60">
              {hasOptions ? (
                grouped.map(({ category, items }) => (
                  <div key={category} className="flex flex-col gap-2 p-3">
                    <span
                      data-testid="field-selector-category"
                      className="text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {category}
                    </span>
                    <div className="flex flex-col gap-1">
                      {items.map((option) => (
                        <Button
                          key={option.id}
                          data-testid="field-selector-option"
                          variant="ghost"
                          className="justify-start text-sm font-medium"
                          disabled={option.disabled}
                          onClick={() => onOptionSelect(option)}
                        >
                          <span className="flex flex-col items-start">
                            <span>{option.label}</span>
                            {option.description ? (
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  data-testid="field-selector-empty"
                  className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
                >
                  <span>No fields match your search.</span>
                  <span>Try a different keyword.</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldSelectorModal;
