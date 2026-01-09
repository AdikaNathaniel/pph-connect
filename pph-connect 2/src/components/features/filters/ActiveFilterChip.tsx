import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FilterValue } from '@/types/filters'

type ActiveFilterChipProps = {
  filter: FilterValue
  onEdit: (filter: FilterValue) => void
  onRemove: (filterId: string) => void
}

export function ActiveFilterChip({ filter, onEdit, onRemove }: ActiveFilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="px-3 py-1.5 gap-2 cursor-pointer hover:bg-secondary/80 transition-colors"
      onClick={() => onEdit(filter)}
    >
      <span className="text-sm">
        <span className="font-medium">{filter.fieldLabel}:</span> {filter.displayLabel}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(filter.id)
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  )
}
