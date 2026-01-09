import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Save, FolderOpen } from 'lucide-react'

export type FilterField =
  | 'name'
  | 'email'
  | 'status'
  | 'department'
  | 'team'
  | 'bgc_expiration'
  | 'hire_date'
  | 'supervisor'

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'is'
  | 'is_not'
  | 'is_one_of'
  | 'before'
  | 'after'
  | 'between'
  | 'within_next_days'
  | 'is_null'
  | 'is_not_null'

export type FilterLogic = 'AND' | 'OR'

export type Filter = {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string | string[]
}

export type FilterPreset = {
  name: string
  filters: Filter[]
  logic: FilterLogic
}

type FilterBuilderProps = {
  filters: Filter[]
  logic: FilterLogic
  onFiltersChange: (filters: Filter[]) => void
  onLogicChange: (logic: FilterLogic) => void
  onSavePreset: (preset: FilterPreset) => void
  onLoadPreset: (preset: FilterPreset) => void
  presets: FilterPreset[]
}

const FIELD_LABELS: Record<FilterField, string> = {
  name: 'Name',
  email: 'Email',
  status: 'Status',
  department: 'Department',
  team: 'Team',
  bgc_expiration: 'BGC Expiration',
  hire_date: 'Hire Date',
  supervisor: 'Supervisor',
}

const FIELD_OPERATORS: Record<FilterField, FilterOperator[]> = {
  name: ['contains', 'equals', 'starts_with', 'ends_with'],
  email: ['contains', 'equals', 'starts_with', 'ends_with'],
  status: ['is', 'is_not', 'is_one_of'],
  department: ['is', 'is_not', 'is_null', 'is_not_null'],
  team: ['is', 'is_not', 'is_null', 'is_not_null'],
  bgc_expiration: ['before', 'after', 'within_next_days', 'is_null', 'is_not_null'],
  hire_date: ['before', 'after', 'between'],
  supervisor: ['is', 'is_not', 'is_null', 'is_not_null'],
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: 'Contains',
  equals: 'Equals',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  is: 'Is',
  is_not: 'Is not',
  is_one_of: 'Is one of',
  before: 'Before',
  after: 'After',
  between: 'Between',
  within_next_days: 'Within next (days)',
  is_null: 'Is empty',
  is_not_null: 'Is not empty',
}

const STATUS_OPTIONS = ['active', 'pending', 'terminated', 'inactive']

export function FilterBuilder({
  filters,
  logic,
  onFiltersChange,
  onLogicChange,
  onSavePreset,
  onLoadPreset,
  presets,
}: FilterBuilderProps) {
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      field: 'name',
      operator: 'contains',
      value: '',
    }
    onFiltersChange([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    onFiltersChange(
      filters.map((f) => {
        if (f.id === id) {
          // Reset operator and value when field changes
          if (updates.field && updates.field !== f.field) {
            const defaultOperator = FIELD_OPERATORS[updates.field][0]
            return { ...f, ...updates, operator: defaultOperator, value: '' }
          }
          return { ...f, ...updates }
        }
        return f
      })
    )
  }

  const clearAllFilters = () => {
    onFiltersChange([])
  }

  const handleSavePreset = () => {
    if (presetName.trim() && filters.length > 0) {
      onSavePreset({ name: presetName.trim(), filters, logic })
      setPresetName('')
      setShowSavePreset(false)
    }
  }

  const needsValueInput = (operator: FilterOperator) => {
    return !['is_null', 'is_not_null'].includes(operator)
  }

  const renderValueInput = (filter: Filter) => {
    if (!needsValueInput(filter.operator)) {
      return null
    }

    // Date inputs
    if (filter.field === 'bgc_expiration' || filter.field === 'hire_date') {
      if (filter.operator === 'within_next_days') {
        return (
          <Input
            type="number"
            placeholder="Number of days"
            value={filter.value as string}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="w-32"
          />
        )
      }
      return (
        <Input
          type="date"
          value={filter.value as string}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className="w-48"
        />
      )
    }

    // Status dropdown
    if (filter.field === 'status') {
      return (
        <Select value={filter.value as string} onValueChange={(value) => updateFilter(filter.id, { value })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Default text input
    return (
      <Input
        placeholder="Enter value..."
        value={filter.value as string}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        className="w-64"
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Advanced Filters</CardTitle>
            <CardDescription>Build complex queries to find specific workers</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {presets.length > 0 && (
              <Select onValueChange={(value) => {
                const preset = presets.find((p) => p.name === value)
                if (preset) onLoadPreset(preset)
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Load preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filters.length > 0 && (
              <>
                {showSavePreset ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                      className="w-48"
                    />
                    <Button size="sm" onClick={handleSavePreset}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowSavePreset(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logic Toggle */}
        {filters.length > 1 && (
          <div className="flex items-center gap-2">
            <Label>Match:</Label>
            <div className="flex gap-1">
              <Button
                variant={logic === 'AND' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLogicChange('AND')}
              >
                AND (all)
              </Button>
              <Button
                variant={logic === 'OR' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLogicChange('OR')}
              >
                OR (any)
              </Button>
            </div>
          </div>
        )}

        {/* Filter Rows */}
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={filter.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              {index > 0 && (
                <Badge variant="outline" className="shrink-0">
                  {logic}
                </Badge>
              )}

              {/* Field Selector */}
              <Select value={filter.field} onValueChange={(value) => updateFilter(filter.id, { field: value as FilterField })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_LABELS).map(([field, label]) => (
                    <SelectItem key={field} value={field}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator Selector */}
              <Select value={filter.operator} onValueChange={(value) => updateFilter(filter.id, { operator: value as FilterOperator })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPERATORS[filter.field].map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {OPERATOR_LABELS[operator]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value Input */}
              {renderValueInput(filter)}

              {/* Remove Button */}
              <Button variant="ghost" size="sm" onClick={() => removeFilter(filter.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={addFilter}>
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
          {filters.length > 0 && (
            <Button variant="ghost" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
