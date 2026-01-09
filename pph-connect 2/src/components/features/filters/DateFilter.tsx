import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import type { FilterField, FilterValue, FilterOperator, DateRange } from '@/types/filters'

type DateFilterProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FilterField
  existingFilter?: FilterValue
  onApply: (filter: FilterValue) => void
}

type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

// Helper to convert Date to YYYY-MM-DD string for input
const dateToInputValue = (date: Date | undefined): string => {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

// Helper to convert YYYY-MM-DD string to Date
const inputValueToDate = (value: string): Date | undefined => {
  if (!value) return undefined
  const date = new Date(value + 'T00:00:00')
  return isNaN(date.getTime()) ? undefined : date
}

export function DateFilter({
  open,
  onOpenChange,
  field,
  existingFilter,
  onApply,
}: DateFilterProps) {
  const [operator, setOperator] = useState<FilterOperator>(
    existingFilter?.operator || 'between'
  )
  const [preset, setPreset] = useState<DatePreset>('custom')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (existingFilter && existingFilter.operator === 'between') {
      const dateRange = existingFilter.values as DateRange
      setStartDate(dateRange.start)
      setEndDate(dateRange.end)
    } else if (existingFilter && ['before', 'after', 'equal'].includes(existingFilter.operator)) {
      const dateRange = existingFilter.values as DateRange
      setSingleDate(dateRange.start)
    }
  }, [existingFilter])

  const getPresetDates = (presetValue: DatePreset): { start: Date; end: Date } | null => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (presetValue) {
      case 'today':
        return { start: today, end: today }
      case 'yesterday': {
        const yesterday = subDays(today, 1)
        return { start: yesterday, end: yesterday }
      }
      case 'last7days':
        return { start: subDays(today, 7), end: today }
      case 'thisWeek':
        return { start: startOfWeek(today), end: endOfWeek(today) }
      case 'lastWeek': {
        const lastWeekStart = startOfWeek(subDays(today, 7))
        const lastWeekEnd = endOfWeek(subDays(today, 7))
        return { start: lastWeekStart, end: lastWeekEnd }
      }
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfMonth(today) }
      case 'lastMonth': {
        const lastMonthDate = subDays(startOfMonth(today), 1)
        return { start: startOfMonth(lastMonthDate), end: endOfMonth(lastMonthDate) }
      }
      case 'thisQuarter':
        return { start: startOfQuarter(today), end: endOfQuarter(today) }
      case 'lastQuarter': {
        const lastQuarterDate = subDays(startOfQuarter(today), 1)
        return { start: startOfQuarter(lastQuarterDate), end: endOfQuarter(lastQuarterDate) }
      }
      case 'thisYear':
        return { start: startOfYear(today), end: endOfYear(today) }
      case 'lastYear': {
        const lastYearDate = subDays(startOfYear(today), 1)
        return { start: startOfYear(lastYearDate), end: endOfYear(lastYearDate) }
      }
      default:
        return null
    }
  }

  const handlePresetChange = (presetValue: DatePreset) => {
    setPreset(presetValue)
    if (presetValue !== 'custom') {
      const dates = getPresetDates(presetValue)
      if (dates) {
        setStartDate(dates.start)
        setEndDate(dates.end)
      }
    }
  }

  const handleApply = () => {
    let filter: FilterValue | null = null

    if (operator === 'between') {
      if (!startDate || !endDate) return

      const displayLabel =
        preset !== 'custom'
          ? preset.replace(/([A-Z])/g, ' $1').trim()
          : `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`

      filter = {
        id: existingFilter?.id || crypto.randomUUID(),
        field: field.key,
        fieldLabel: field.label,
        operator: 'between',
        values: { start: startDate, end: endDate },
        displayLabel,
      }
    } else if (['before', 'after', 'equal'].includes(operator)) {
      if (!singleDate) return

      const operatorLabel = operator === 'before' ? 'Before' : operator === 'after' ? 'After' : 'On'
      filter = {
        id: existingFilter?.id || crypto.randomUUID(),
        field: field.key,
        fieldLabel: field.label,
        operator,
        values: { start: singleDate, end: singleDate },
        displayLabel: `${operatorLabel} ${format(singleDate, 'MMM d, yyyy')}`,
      }
    }

    if (filter) {
      onApply(filter)
      onOpenChange(false)
    }
  }

  const isApplyEnabled = () => {
    if (operator === 'between') {
      return startDate && endDate
    }
    return singleDate !== undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{field.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Operator selector */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={operator}
              onValueChange={(value) => {
                setOperator(value as FilterOperator)
                if (value !== 'between') {
                  setPreset('custom')
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="between">Between (date range)</SelectItem>
                <SelectItem value="before">Before</SelectItem>
                <SelectItem value="after">After</SelectItem>
                <SelectItem value="equal">Equal to</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operator === 'between' ? (
            <>
              {/* Preset selector */}
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <Select value={preset} onValueChange={(value) => handlePresetChange(value as DatePreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="thisWeek">This week</SelectItem>
                    <SelectItem value="lastWeek">Last week</SelectItem>
                    <SelectItem value="thisMonth">This month</SelectItem>
                    <SelectItem value="lastMonth">Last month</SelectItem>
                    <SelectItem value="thisQuarter">This quarter</SelectItem>
                    <SelectItem value="lastQuarter">Last quarter</SelectItem>
                    <SelectItem value="thisYear">This year</SelectItem>
                    <SelectItem value="lastYear">Last year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateToInputValue(startDate)}
                    onChange={(e) => {
                      setStartDate(inputValueToDate(e.target.value))
                      setPreset('custom')
                    }}
                    max={dateToInputValue(endDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateToInputValue(endDate)}
                    onChange={(e) => {
                      setEndDate(inputValueToDate(e.target.value))
                      setPreset('custom')
                    }}
                    min={dateToInputValue(startDate)}
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="text-sm text-muted-foreground">
                  Selected: {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Single date picker */}
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={dateToInputValue(singleDate)}
                  onChange={(e) => setSingleDate(inputValueToDate(e.target.value))}
                />
              </div>

              {singleDate && (
                <div className="text-sm text-muted-foreground">
                  Selected: {format(singleDate, 'MMM d, yyyy')}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!isApplyEnabled()}>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
