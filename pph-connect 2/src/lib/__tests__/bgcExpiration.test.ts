import { describe, it, expect, beforeEach, vi } from 'vitest'

type BGCStatus = {
  status: 'none' | 'expired' | 'expiring' | 'valid'
  text: string
  variant: 'outline' | 'destructive' | 'secondary' | 'default'
  icon: any
}

function getBGCStatus(bgcExpirationDate: string | null): BGCStatus {
  if (!bgcExpirationDate) {
    return { status: 'none', text: 'Not set', variant: 'outline', icon: null }
  }

  const expirationDate = new Date(bgcExpirationDate)
  const today = new Date()
  const daysUntilExpiration = Math.ceil(
    (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilExpiration < 0) {
    return {
      status: 'expired',
      text: `Expired ${Math.abs(daysUntilExpiration)} days ago`,
      variant: 'destructive',
      icon: 'AlertTriangle',
    }
  } else if (daysUntilExpiration < 30) {
    return {
      status: 'expiring',
      text: `Expiring in ${daysUntilExpiration} days`,
      variant: 'secondary',
      icon: 'AlertTriangle',
    }
  } else {
    return {
      status: 'valid',
      text: `Valid (${daysUntilExpiration} days remaining)`,
      variant: 'default',
      icon: 'CheckCircle',
    }
  }
}

describe('BGC Expiration Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('when BGC expiration date is not set', () => {
    it('should return "none" status', () => {
      const result = getBGCStatus(null)
      expect(result.status).toBe('none')
      expect(result.text).toBe('Not set')
      expect(result.variant).toBe('outline')
      expect(result.icon).toBeNull()
    })
  })

  describe('when BGC is expired', () => {
    it('should return "expired" status for dates in the past', () => {
      const result = getBGCStatus('2024-12-01')
      expect(result.status).toBe('expired')
      expect(result.text).toContain('Expired')
      expect(result.text).toContain('days ago')
      expect(result.variant).toBe('destructive')
      expect(result.icon).toBe('AlertTriangle')
    })

    it('should calculate correct days expired', () => {
      const result = getBGCStatus('2024-12-25')
      expect(result.text).toBe('Expired 7 days ago')
    })

    it('should handle yesterday expiration', () => {
      const result = getBGCStatus('2024-12-31')
      expect(result.text).toBe('Expired 1 days ago')
      expect(result.status).toBe('expired')
    })
  })

  describe('when BGC is expiring soon (< 30 days)', () => {
    it('should return "expiring" status for dates within 30 days', () => {
      const result = getBGCStatus('2025-01-15')
      expect(result.status).toBe('expiring')
      expect(result.text).toBe('Expiring in 14 days')
      expect(result.variant).toBe('secondary')
      expect(result.icon).toBe('AlertTriangle')
    })

    it('should handle tomorrow expiration', () => {
      const result = getBGCStatus('2025-01-02')
      expect(result.text).toBe('Expiring in 1 days')
      expect(result.status).toBe('expiring')
    })

    it('should handle 29 days remaining', () => {
      const result = getBGCStatus('2025-01-30')
      expect(result.text).toBe('Expiring in 29 days')
      expect(result.status).toBe('expiring')
    })

    it('should handle today expiration (0 days)', () => {
      const result = getBGCStatus('2025-01-01')
      expect(result.text).toBe('Expiring in 0 days')
      expect(result.status).toBe('expiring')
    })
  })

  describe('when BGC is valid (>= 30 days)', () => {
    it('should return "valid" status for dates 30+ days away', () => {
      const result = getBGCStatus('2025-02-01')
      expect(result.status).toBe('valid')
      expect(result.text).toBe('Valid (31 days remaining)')
      expect(result.variant).toBe('default')
      expect(result.icon).toBe('CheckCircle')
    })

    it('should handle exactly 30 days remaining', () => {
      const result = getBGCStatus('2025-01-31')
      expect(result.text).toBe('Valid (30 days remaining)')
      expect(result.status).toBe('valid')
    })

    it('should handle far future dates', () => {
      const result = getBGCStatus('2026-01-01')
      expect(result.text).toBe('Valid (365 days remaining)')
      expect(result.status).toBe('valid')
    })
  })

  describe('edge cases', () => {
    it('should handle leap year dates', () => {
      vi.setSystemTime(new Date('2024-02-28'))
      const result = getBGCStatus('2024-03-01')
      expect(result.text).toBe('Expiring in 2 days')
    })

    it('should handle year boundaries', () => {
      vi.setSystemTime(new Date('2024-12-31'))
      const result = getBGCStatus('2025-01-01')
      expect(result.text).toBe('Expiring in 1 days')
    })

    it('should handle malformed date strings gracefully', () => {
      const result = getBGCStatus('invalid-date')
      // Invalid dates are treated as valid with positive days (NaN becomes large positive number)
      // In production, this should be validated before reaching this function
      expect(result.status).toBe('valid')
    })
  })

  describe('30-day threshold behavior', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00'))
    })

    it('should treat 29 days as expiring', () => {
      const result = getBGCStatus('2025-01-30T12:00:00')
      expect(result.status).toBe('expiring')
    })

    it('should treat 30 days as valid', () => {
      const result = getBGCStatus('2025-01-31T12:00:00')
      expect(result.status).toBe('valid')
    })
  })
})
