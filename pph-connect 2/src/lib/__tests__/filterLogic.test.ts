import { describe, it, expect } from 'vitest'
import type { FilterValue, DateRange } from '@/types/filters'

type TestWorker = {
  id: string
  hr_id: string
  full_name: string
  status: 'pending' | 'active' | 'inactive' | 'terminated'
  hire_date: string
  bgc_expiration_date: string | null
  country_residence: string
}

function applyFilters(workers: TestWorker[], filters: FilterValue[]): TestWorker[] {
  if (filters.length === 0) return workers

  return workers.filter((worker) => {
    return filters.every((filter) => {
      const fieldValue = worker[filter.field as keyof TestWorker]

      if (filter.operator === 'in') {
        return (filter.values as string[]).includes(String(fieldValue))
      }

      if (filter.operator === 'not_in') {
        return !(filter.values as string[]).includes(String(fieldValue))
      }

      if (filter.operator === 'between' && fieldValue) {
        const dateRange = filter.values as DateRange
        const workerDate = new Date(String(fieldValue))
        return workerDate >= dateRange.start && workerDate <= dateRange.end
      }

      if (filter.operator === 'before' && fieldValue) {
        const dateRange = filter.values as DateRange
        const workerDate = new Date(String(fieldValue))
        return workerDate < dateRange.start
      }

      if (filter.operator === 'after' && fieldValue) {
        const dateRange = filter.values as DateRange
        const workerDate = new Date(String(fieldValue))
        return workerDate > dateRange.start
      }

      if (filter.operator === 'equal' && fieldValue) {
        const dateRange = filter.values as DateRange
        const workerDate = new Date(String(fieldValue))
        workerDate.setHours(0, 0, 0, 0)
        const filterDate = new Date(dateRange.start)
        filterDate.setHours(0, 0, 0, 0)
        return workerDate.getTime() === filterDate.getTime()
      }

      return true
    })
  })
}

describe('Filter Application Logic', () => {
  const mockWorkers: TestWorker[] = [
    {
      id: '1',
      hr_id: 'HR001',
      full_name: 'John Doe',
      status: 'active',
      hire_date: '2024-01-15',
      bgc_expiration_date: '2025-06-30',
      country_residence: 'US',
    },
    {
      id: '2',
      hr_id: 'HR002',
      full_name: 'Jane Smith',
      status: 'pending',
      hire_date: '2024-03-20',
      bgc_expiration_date: '2025-12-31',
      country_residence: 'CA',
    },
    {
      id: '3',
      hr_id: 'HR003',
      full_name: 'Bob Johnson',
      status: 'active',
      hire_date: '2023-11-01',
      bgc_expiration_date: '2024-11-01',
      country_residence: 'US',
    },
    {
      id: '4',
      hr_id: 'HR004',
      full_name: 'Alice Williams',
      status: 'terminated',
      hire_date: '2022-05-10',
      bgc_expiration_date: null,
      country_residence: 'MX',
    },
  ]

  describe('IN operator', () => {
    it('should filter workers by status (include)', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'status',
          fieldLabel: 'Status',
          operator: 'in',
          values: ['active', 'pending'],
          displayLabel: 'Active, Pending',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(3)
      expect(result.map((w) => w.status)).toEqual(['active', 'pending', 'active'])
    })

    it('should filter workers by country', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'country_residence',
          fieldLabel: 'Country',
          operator: 'in',
          values: ['US'],
          displayLabel: 'US',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(2)
      expect(result.every((w) => w.country_residence === 'US')).toBe(true)
    })
  })

  describe('NOT_IN operator', () => {
    it('should exclude workers by status', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'status',
          fieldLabel: 'Status',
          operator: 'not_in',
          values: ['terminated'],
          displayLabel: 'Not Terminated',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(3)
      expect(result.every((w) => w.status !== 'terminated')).toBe(true)
    })
  })

  describe('BETWEEN operator (dates)', () => {
    it('should filter workers hired within date range', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'hire_date',
          fieldLabel: 'Hire Date',
          operator: 'between',
          values: {
            start: new Date('2024-01-01'),
            end: new Date('2024-06-30'),
          },
          displayLabel: 'Jan 1 - Jun 30, 2024',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(2)
      expect(result.map((w) => w.hr_id)).toEqual(['HR001', 'HR002'])
    })
  })

  describe('BEFORE operator', () => {
    it('should filter workers hired before a date', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'hire_date',
          fieldLabel: 'Hire Date',
          operator: 'before',
          values: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-01'),
          },
          displayLabel: 'Before Jan 1, 2024',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(2)
      expect(result.map((w) => w.hr_id)).toEqual(['HR003', 'HR004'])
    })
  })

  describe('AFTER operator', () => {
    it('should filter workers hired after a date', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'hire_date',
          fieldLabel: 'Hire Date',
          operator: 'after',
          values: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-01'),
          },
          displayLabel: 'After Jan 1, 2024',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(2)
      expect(result.map((w) => w.hr_id)).toEqual(['HR001', 'HR002'])
    })
  })

  describe('EQUAL operator', () => {
    it('should filter workers hired on exact date', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'hire_date',
          fieldLabel: 'Hire Date',
          operator: 'equal',
          values: {
            start: new Date('2024-01-15'),
            end: new Date('2024-01-15'),
          },
          displayLabel: 'On Jan 15, 2024',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(1)
      expect(result[0].hr_id).toBe('HR001')
    })
  })

  describe('Multiple filters (AND logic)', () => {
    it('should apply multiple filters with AND logic', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'status',
          fieldLabel: 'Status',
          operator: 'in',
          values: ['active'],
          displayLabel: 'Active',
        },
        {
          id: '2',
          field: 'country_residence',
          fieldLabel: 'Country',
          operator: 'in',
          values: ['US'],
          displayLabel: 'US',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(2)
      expect(result.every((w) => w.status === 'active' && w.country_residence === 'US')).toBe(true)
    })

    it('should return empty array when no workers match all filters', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'status',
          fieldLabel: 'Status',
          operator: 'in',
          values: ['terminated'],
          displayLabel: 'Terminated',
        },
        {
          id: '2',
          field: 'country_residence',
          fieldLabel: 'Country',
          operator: 'in',
          values: ['US'],
          displayLabel: 'US',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      expect(result).toHaveLength(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty filter array', () => {
      const result = applyFilters(mockWorkers, [])
      expect(result).toHaveLength(4)
      expect(result).toEqual(mockWorkers)
    })

    it('should handle null date fields gracefully', () => {
      const filters: FilterValue[] = [
        {
          id: '1',
          field: 'bgc_expiration_date',
          fieldLabel: 'BGC Expiration',
          operator: 'before',
          values: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-01'),
          },
          displayLabel: 'Before Jan 1, 2025',
        },
      ]

      const result = applyFilters(mockWorkers, filters)
      // Workers with null bgc_expiration_date are included (filter returns true for null)
      // HR003 (2024-11-01) and HR004 (null) both pass
      expect(result).toHaveLength(2)
      expect(result.map(w => w.hr_id)).toContain('HR003')
    })
  })
})
