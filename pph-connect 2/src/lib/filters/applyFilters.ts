import { Filter, FilterLogic } from '@/components/filters/FilterBuilder'
import { differenceInDays, isBefore, isAfter, parseISO } from 'date-fns'

type Worker = {
  id: string
  first_name: string
  last_name: string
  email_personal: string
  status: string
  department_id: string | null
  team_id: string | null
  bgc_expiration_date: string | null
  hire_date: string | null
  supervisor_id: string | null
  [key: string]: any
}

export function applyFilters(workers: Worker[], filters: Filter[], logic: FilterLogic): Worker[] {
  if (filters.length === 0) return workers

  return workers.filter((worker) => {
    const results = filters.map((filter) => matchesFilter(worker, filter))

    // Apply AND/OR logic
    if (logic === 'AND') {
      return results.every((result) => result)
    } else {
      return results.some((result) => result)
    }
  })
}

function matchesFilter(worker: Worker, filter: Filter): boolean {
  const { field, operator, value } = filter

  // Get the field value from worker
  let fieldValue: any

  switch (field) {
    case 'name':
      fieldValue = `${worker.first_name} ${worker.last_name}`.toLowerCase()
      break
    case 'email':
      fieldValue = worker.email_personal?.toLowerCase() || ''
      break
    case 'status':
      fieldValue = worker.status
      break
    case 'department':
      fieldValue = worker.department_id
      break
    case 'team':
      fieldValue = worker.team_id
      break
    case 'bgc_expiration':
      fieldValue = worker.bgc_expiration_date
      break
    case 'hire_date':
      fieldValue = worker.hire_date
      break
    case 'supervisor':
      fieldValue = worker.supervisor_id
      break
    default:
      return false
  }

  // Handle null/empty operators
  if (operator === 'is_null') {
    return fieldValue === null || fieldValue === undefined || fieldValue === ''
  }

  if (operator === 'is_not_null') {
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
  }

  // If value is required but not provided, don't match
  if (!value && value !== 0) {
    return false
  }

  // Apply operator-specific logic
  switch (operator) {
    case 'contains':
      return fieldValue?.includes(value.toString().toLowerCase())

    case 'equals':
      return fieldValue?.toLowerCase() === value.toString().toLowerCase()

    case 'starts_with':
      return fieldValue?.startsWith(value.toString().toLowerCase())

    case 'ends_with':
      return fieldValue?.endsWith(value.toString().toLowerCase())

    case 'is':
      return fieldValue === value

    case 'is_not':
      return fieldValue !== value

    case 'is_one_of':
      const values = Array.isArray(value) ? value : [value]
      return values.includes(fieldValue)

    case 'before':
      if (!fieldValue) return false
      try {
        return isBefore(parseISO(fieldValue), parseISO(value as string))
      } catch {
        return false
      }

    case 'after':
      if (!fieldValue) return false
      try {
        return isAfter(parseISO(fieldValue), parseISO(value as string))
      } catch {
        return false
      }

    case 'within_next_days':
      if (!fieldValue) return false
      try {
        const days = parseInt(value as string, 10)
        if (isNaN(days)) return false

        const diff = differenceInDays(parseISO(fieldValue), new Date())
        return diff >= 0 && diff <= days
      } catch {
        return false
      }

    default:
      return false
  }
}
