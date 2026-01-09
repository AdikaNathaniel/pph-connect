import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeDate, isDateInRange } from './date';

describe('formatDate', () => {
  it('formats yyyy-MM-dd tokens', () => {
    expect(formatDate('2025-05-10T00:00:00Z', 'yyyy-MM-dd')).toBe('2025-05-10');
    expect(formatDate(new Date('2025-12-01T00:00:00Z'), 'MMM d')).toBe('Dec 1');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date', 'yyyy')).toBe('');
  });
});

describe('formatRelativeDate', () => {
  const base = new Date('2025-01-01T00:00:00Z');

  it('describes future dates', () => {
    expect(formatRelativeDate('2025-01-02T00:00:00Z', base)).toBe('in 1 day');
  });

  it('describes past dates', () => {
    expect(formatRelativeDate('2024-12-31T00:00:00Z', base)).toBe('1 day ago');
  });

  it('handles invalid inputs', () => {
    expect(formatRelativeDate('invalid', base)).toBe('');
  });
});

describe('isDateInRange', () => {
  it('returns true when target inside range', () => {
    expect(isDateInRange('2025-01-05', '2025-01-01', '2025-01-10')).toBe(true);
  });

  it('returns false when outside range or invalid', () => {
    expect(isDateInRange('2025-01-15', '2025-01-01', '2025-01-10')).toBe(false);
    expect(isDateInRange('bad', '2025-01-01', '2025-01-10')).toBe(false);
  });
});
