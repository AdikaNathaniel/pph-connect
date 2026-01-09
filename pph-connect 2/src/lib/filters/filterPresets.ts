import { FilterPreset } from '@/components/filters/FilterBuilder'

const STORAGE_KEY = 'pph-connect-filter-presets'

export function getDefaultPresets(): FilterPreset[] {
  return [
    {
      name: 'Active Workers',
      logic: 'AND',
      filters: [
        {
          id: '1',
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      ],
    },
    {
      name: 'BGC Expiring Soon',
      logic: 'AND',
      filters: [
        {
          id: '2',
          field: 'bgc_expiration',
          operator: 'within_next_days',
          value: '30',
        },
        {
          id: '3',
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      ],
    },
    {
      name: 'Recently Hired',
      logic: 'AND',
      filters: [
        {
          id: '4',
          field: 'hire_date',
          operator: 'within_next_days',
          value: '90',
        },
      ],
    },
    {
      name: 'No Department',
      logic: 'AND',
      filters: [
        {
          id: '5',
          field: 'department',
          operator: 'is_null',
          value: '',
        },
      ],
    },
  ]
}

export function getSavedPresets(): FilterPreset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load presets:', error)
  }
  return []
}

export function getAllPresets(): FilterPreset[] {
  const defaults = getDefaultPresets()
  const saved = getSavedPresets()
  return [...defaults, ...saved]
}

export function savePreset(preset: FilterPreset): void {
  try {
    const saved = getSavedPresets()
    // Check if preset with same name exists
    const existingIndex = saved.findIndex((p) => p.name === preset.name)

    if (existingIndex >= 0) {
      // Update existing preset
      saved[existingIndex] = preset
    } else {
      // Add new preset
      saved.push(preset)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch (error) {
    console.error('Failed to save preset:', error)
  }
}

export function deletePreset(name: string): void {
  try {
    const saved = getSavedPresets()
    const filtered = saved.filter((p) => p.name !== name)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete preset:', error)
  }
}
