import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ActiveFilterChipProps {
  label: string;
  description?: string;
  onClick?: () => void;
  onRemove: () => void;
  className?: string;
}

export const ActiveFilterChip: React.FC<ActiveFilterChipProps> = ({
  label,
  description,
  onClick,
  onRemove,
  className
}) => (
  <Badge
    data-testid="active-filter-chip"
    variant="secondary"
    className={cn(
      'inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary transition hover:border-primary/60 hover:bg-primary/15',
      className
    )}
  >
    <button
      type="button"
      className="flex flex-col items-start text-left outline-none focus-visible:text-primary"
      onClick={onClick}
    >
      <span className="text-sm font-semibold">{label}</span>
      {description ? (
        <span className="text-xs text-primary/70">{description}</span>
      ) : null}
    </button>
    <Button
      data-testid="active-filter-remove"
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-primary/80 hover:text-destructive"
      onClick={onRemove}
    >
      <X className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">Remove filter {label}</span>
    </Button>
  </Badge>
);

export default ActiveFilterChip;
