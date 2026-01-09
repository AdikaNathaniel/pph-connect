import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { ActiveFilterChip } from './ActiveFilterChip'
import { FieldSelectorModal } from './FieldSelectorModal'
import { TextFilter } from './TextFilter'
import { DateFilter } from './DateFilter'
import type { FilterField, FilterValue } from '@/types/filters'

type FilterBarProps = {
  fields: FilterField[]
  filters: FilterValue[]
  onFiltersChange: (filters: FilterValue[]) => void
}

export function FilterBar({ fields, filters, onFiltersChange }: FilterBarProps) {
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<FilterField | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<FilterValue | undefined>(undefined)

  const handleFieldSelect = (field: FilterField) => {
    setSelectedField(field)
    setEditingFilter(undefined)
    setIsFilterModalOpen(true)
  }

  const handleFilterApply = (filter: FilterValue) => {
    if (editingFilter) {
      const updatedFilters = filters.map((f) =>
        f.id === editingFilter.id ? filter : f
      )
      onFiltersChange(updatedFilters)
    } else {
      onFiltersChange([...filters, filter])
    }
    setEditingFilter(undefined)
    setSelectedField(null)
  }

  const handleEditFilter = (filter: FilterValue) => {
    const field = fields.find((f) => f.key === filter.field)
    if (field) {
      setSelectedField(field)
      setEditingFilter(filter)
      setIsFilterModalOpen(true)
    }
  }

  const handleRemoveFilter = (filterId: string) => {
    onFiltersChange(filters.filter((f) => f.id !== filterId))
  }

  const handleClearAll = () => {
    onFiltersChange([])
  }

  const handleModalClose = () => {
    setIsFilterModalOpen(false)
    setSelectedField(null)
    setEditingFilter(undefined)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFieldSelectorOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Filter
        </Button>

        {filters.map((filter) => (
          <ActiveFilterChip
            key={filter.id}
            filter={filter}
            onEdit={handleEditFilter}
            onRemove={handleRemoveFilter}
          />
        ))}

        {filters.length > 0 && (
          <>
            <Badge variant="outline" className="px-2 py-1">
              {filters.length} {filters.length === 1 ? 'filter' : 'filters'} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Clear All
            </Button>
          </>
        )}
      </div>

      {/* Field Selector Modal */}
      <FieldSelectorModal
        open={isFieldSelectorOpen}
        onOpenChange={setIsFieldSelectorOpen}
        fields={fields}
        onFieldSelect={handleFieldSelect}
      />

      {/* Filter Type Modals */}
      {selectedField && (
        <>
          {(selectedField.type === 'categorical' || selectedField.type === 'text') && (
            <TextFilter
              open={isFilterModalOpen}
              onOpenChange={handleModalClose}
              field={selectedField}
              existingFilter={editingFilter}
              onApply={handleFilterApply}
            />
          )}

          {selectedField.type === 'date' && (
            <DateFilter
              open={isFilterModalOpen}
              onOpenChange={handleModalClose}
              field={selectedField}
              existingFilter={editingFilter}
              onApply={handleFilterApply}
            />
          )}
        </>
      )}
    </div>
  )
}
