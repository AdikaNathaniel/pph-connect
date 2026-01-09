import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import type { FilterField, FilterValue, FilterOperator } from '@/types/filters'

type TextFilterProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FilterField
  existingFilter?: FilterValue
  onApply: (filter: FilterValue) => void
}

export function TextFilter({
  open,
  onOpenChange,
  field,
  existingFilter,
  onApply,
}: TextFilterProps) {
  const [mode, setMode] = useState<'include' | 'exclude'>(
    existingFilter?.mode || 'include'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(
    existingFilter?.values as string[] || []
  )

  useEffect(() => {
    if (existingFilter) {
      setMode(existingFilter.mode || 'include')
      setSelectedValues(existingFilter.values as string[])
    }
  }, [existingFilter])

  const options = field.options || []
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePasteDetection = (value: string) => {
    if (value.includes(',')) {
      const pastedValues = value
        .split(',')
        .map((v) => v.trim().replace(/["']/g, ''))
        .filter(Boolean)

      const matchedValues = options
        .filter((option) =>
          pastedValues.some(
            (pv) => pv.toLowerCase() === option.label.toLowerCase()
          )
        )
        .map((option) => option.value)

      setSelectedValues((prev) => {
        const newValues = [...new Set([...prev, ...matchedValues])]
        return newValues
      })
      setSearchQuery('')
    } else {
      setSearchQuery(value)
    }
  }

  const toggleValue = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    )
  }

  const selectAll = () => {
    setSelectedValues(options.map((o) => o.value))
  }

  const clearAll = () => {
    setSelectedValues([])
  }

  const handleApply = () => {
    if (selectedValues.length === 0) return

    const operator: FilterOperator = mode === 'include' ? 'in' : 'not_in'
    const displayLabels = selectedValues
      .map((val) => options.find((o) => o.value === val)?.label || val)
      .slice(0, 3)
      .join(', ')
    const displayLabel =
      selectedValues.length > 3
        ? `${displayLabels} +${selectedValues.length - 3} more`
        : displayLabels

    const filter: FilterValue = {
      id: existingFilter?.id || crypto.randomUUID(),
      field: field.key,
      fieldLabel: field.label,
      operator,
      values: selectedValues,
      mode,
      displayLabel: `${mode === 'exclude' ? 'Not ' : ''}${displayLabel}`,
    }

    onApply(filter)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{field.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <Label>Filter Mode</Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as 'include' | 'exclude')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="include">Include</SelectItem>
                <SelectItem value="exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search bar */}
          <div>
            <Label>Search or paste values (comma-separated)</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search or paste: active, pending, inactive"
                value={searchQuery}
                onChange={(e) => handlePasteDetection(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Value list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>
                {selectedValues.length > 0
                  ? `${selectedValues.length} of ${options.length} selected`
                  : `${options.length} available`}
              </Label>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={selectAll}
                >
                  Select all
                </Button>
                {selectedValues.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={clearAll}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No options found
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleValue(option.value)}
                    >
                      <Checkbox
                        id={`filter-${field.key}-${option.value}`}
                        checked={selectedValues.includes(option.value)}
                        onCheckedChange={() => toggleValue(option.value)}
                      />
                      <label
                        htmlFor={`filter-${field.key}-${option.value}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        {option.label}
                        {option.count !== undefined && (
                          <span className="text-muted-foreground ml-1">
                            ({option.count})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedValues.length === 0}>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
