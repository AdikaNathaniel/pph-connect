export type FilterOperator =
  | 'in'
  | 'not_in'
  | 'equal'
  | 'not_equal'
  | 'between'
  | 'not_between'
  | 'before'
  | 'after'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'

export type DateRange = {
  start: Date
  end: Date
}

export type FilterValue = {
  id: string
  field: string
  fieldLabel: string
  operator: FilterOperator
  values: string[] | number[] | DateRange
  mode?: 'include' | 'exclude'
  displayLabel: string
}

export type FilterFieldType = 'text' | 'categorical' | 'date' | 'number'

export type FilterField = {
  key: string
  label: string
  type: FilterFieldType
  options?: Array<{ value: string; label: string; count?: number }>
}
