import React from 'react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NumberFilterOperator =
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween';

export interface NumberFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  operator: NumberFilterOperator;
  onOperatorChange: (operator: NumberFilterOperator) => void;
  primaryValue: string;
  onPrimaryValueChange: (value: string) => void;
  secondaryValue?: string;
  onSecondaryValueChange?: (value: string) => void;
  errorMessage?: string | null;
  onApply: () => void;
  isApplyDisabled?: boolean;
  className?: string;
}

const OPERATOR_OPTIONS: Array<{ value: NumberFilterOperator; label: string }> = [
  { value: 'equal', label: 'Equal to' },
  { value: 'notEqual', label: 'Not equal to' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessThanOrEqual', label: 'Less than or equal' },
  { value: 'between', label: 'Between (inclusive)' },
  { value: 'notBetween', label: 'Not between (exclusive)' }
];

const showSecondaryInput = (operator: NumberFilterOperator) =>
  operator === 'between' || operator === 'notBetween';

export const NumberFilter: React.FC<NumberFilterProps> = ({
  open,
  onOpenChange,
  fieldLabel,
  operator,
  onOperatorChange,
  primaryValue,
  onPrimaryValueChange,
  secondaryValue,
  onSecondaryValueChange,
  errorMessage,
  onApply,
  isApplyDisabled,
  className
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="number-filter-modal" className={cn('sm:max-w-md space-y-4', className)}>
        <DialogHeader>
          <DialogTitle>Filter: {fieldLabel}</DialogTitle>
          <DialogDescription>
            Provide numeric conditions to filter{' '}
            <span className="font-medium text-foreground">{fieldLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Operator</span>
            <Select
              value={operator}
              onValueChange={(value) => onOperatorChange(value as NumberFilterOperator)}
            >
              <SelectTrigger data-testid="number-filter-operator">
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
            <span className="text-xs font-medium uppercase text-muted-foreground">Value</span>
            <Input
              data-testid="number-filter-primary"
              inputMode="decimal"
              value={primaryValue}
              onChange={(event) => onPrimaryValueChange(event.target.value)}
              placeholder="Enter value"
            />
          </div>

          {showSecondaryInput(operator) ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Second value</span>
              <Input
                data-testid="number-filter-secondary"
                inputMode="decimal"
                value={secondaryValue ?? ''}
                onChange={(event) => onSecondaryValueChange?.(event.target.value)}
                placeholder="Enter second value"
              />
            </div>
          ) : null}

          {errorMessage ? (
            <span className="text-xs text-destructive">{errorMessage}</span>
          ) : null}
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="number-filter-apply" onClick={onApply} disabled={isApplyDisabled}>
            Apply filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NumberFilter;
