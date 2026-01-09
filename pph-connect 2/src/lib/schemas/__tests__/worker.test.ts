import { describe, it, expect } from 'vitest'
import { workerSchema } from '../worker'

describe('Worker Schema Validation', () => {
  const validWorkerData = {
    hr_id: 'HR001',
    full_name: 'John Doe',
    engagement_model: 'core' as const,
    worker_role: 'Software Engineer',
    email_personal: 'john@example.com',
    email_pph: 'john@pph.com',
    country_residence: 'US',
    locale_primary: 'en_US',
    locale_all: ['en_US', 'es_MX'],
    hire_date: '2024-01-15',
    rtw_datetime: '2024-01-20',
    supervisor_id: '123e4567-e89b-12d3-a456-426614174000',
    team_id: '123e4567-e89b-12d3-a456-426614174001',
    termination_date: '',
    bgc_expiration_date: '2025-06-30',
    status: 'active' as const,
  }

  describe('Required fields', () => {
    it('should validate valid worker data', () => {
      const result = workerSchema.safeParse(validWorkerData)
      expect(result.success).toBe(true)
    })

    it('should reject missing hr_id', () => {
      const { hr_id, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Zod 4.x error message: "Invalid input: expected string, received undefined"
        expect(result.error.issues[0].message).toContain('Invalid input')
      }
    })

    it('should reject missing full_name', () => {
      const { full_name, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Zod 4.x error message: "Invalid input: expected string, received undefined"
        expect(result.error.issues[0].message).toContain('Invalid input')
      }
    })

    it('should reject missing email_personal', () => {
      const { email_personal, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing country_residence', () => {
      const { country_residence, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing locale_primary', () => {
      const { locale_primary, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing hire_date', () => {
      const { hire_date, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Optional fields', () => {
    it('should allow missing worker_role', () => {
      const { worker_role, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty email_pph', () => {
      const data = { ...validWorkerData, email_pph: '' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow missing rtw_datetime', () => {
      const { rtw_datetime, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty supervisor_id', () => {
      const data = { ...validWorkerData, supervisor_id: '' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty team_id', () => {
      const data = { ...validWorkerData, team_id: '' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty termination_date', () => {
      const data = { ...validWorkerData, termination_date: '' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty bgc_expiration_date', () => {
      const data = { ...validWorkerData, bgc_expiration_date: '' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Email validation', () => {
    it('should reject invalid email_personal format', () => {
      const data = { ...validWorkerData, email_personal: 'not-an-email' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email')
      }
    })

    it('should reject invalid email_pph format', () => {
      const data = { ...validWorkerData, email_pph: 'not-an-email' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept valid email formats', () => {
      const data = {
        ...validWorkerData,
        email_personal: 'test+alias@example.co.uk',
        email_pph: 'worker.name@company.com',
      }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Engagement model validation', () => {
    it('should accept valid engagement models', () => {
      const models: Array<'core' | 'upwork' | 'external' | 'internal'> = [
        'core',
        'upwork',
        'external',
        'internal',
      ]

      models.forEach((model) => {
        const data = { ...validWorkerData, engagement_model: model }
        const result = workerSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid engagement model', () => {
      const data = { ...validWorkerData, engagement_model: 'invalid' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Status validation', () => {
    it('should accept valid status values', () => {
      const statuses: Array<'pending' | 'active' | 'inactive' | 'terminated'> = [
        'pending',
        'active',
        'inactive',
        'terminated',
      ]

      statuses.forEach((status) => {
        const data = { ...validWorkerData, status }
        const result = workerSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const data = { ...validWorkerData, status: 'unknown' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should default to pending if status not provided', () => {
      const { status, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('pending')
      }
    })
  })

  describe('UUID validation', () => {
    it('should accept valid UUID for supervisor_id', () => {
      const data = {
        ...validWorkerData,
        supervisor_id: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for supervisor_id', () => {
      const data = { ...validWorkerData, supervisor_id: 'not-a-uuid' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    // Note: team_id was removed from schema - workers relate to teams indirectly
    // through: workers → worker_assignments → workforce_projects → project_teams → teams
  })

  describe('String length validation', () => {
    it('should reject full_name shorter than 2 characters', () => {
      const data = { ...validWorkerData, full_name: 'A' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2')
      }
    })

    it('should reject country_residence shorter than 2 characters', () => {
      const data = { ...validWorkerData, country_residence: 'U' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject locale_primary shorter than 2 characters', () => {
      const data = { ...validWorkerData, locale_primary: 'e' }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Array fields', () => {
    it('should accept empty locale_all array', () => {
      const data = { ...validWorkerData, locale_all: [] }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should default locale_all to empty array if not provided', () => {
      const { locale_all, ...data } = validWorkerData
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.locale_all).toEqual([])
      }
    })

    it('should accept multiple locale values', () => {
      const data = {
        ...validWorkerData,
        locale_all: ['en_US', 'es_MX', 'fr_FR', 'de_DE'],
      }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should trim whitespace from required string fields', () => {
      const data = {
        ...validWorkerData,
        hr_id: '  HR001  ',
        full_name: '  John Doe  ',
      }
      const result = workerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle minimal valid worker data', () => {
      const minimalData = {
        hr_id: 'HR001',
        full_name: 'John Doe',
        engagement_model: 'core' as const,
        email_personal: 'john@example.com',
        country_residence: 'US',
        locale_primary: 'en_US',
        hire_date: '2024-01-01',
      }
      const result = workerSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })
  })
})
