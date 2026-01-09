import { describe, it, expect } from 'vitest';
import { generateBulkUploadTemplate, mapRowToWorkerValues } from '../BulkUploadModal';

describe('Bulk upload CSV helpers', () => {
  it('creates template with required header', () => {
    const template = generateBulkUploadTemplate();
    const [header, example] = template.trim().split('\n');
    expect(header.split(',')).toHaveLength(15);
    expect(example).toContain('HR-000123');
  });

  it('maps valid rows to worker values', () => {
    const row = {
      hr_id: 'HR-1',
      full_name: 'Alice',
      engagement_model: 'core',
      worker_role: 'Reviewer',
      email_personal: 'alice@example.com',
      email_pph: 'alice@pphconnect.com',
      country_residence: 'US',
      locale_primary: 'en-US',
      locale_all: 'en-US|es-ES',
      hire_date: '2025-01-01',
      rtw_datetime: '2025-01-01T09:00',
      supervisor_id: '',
      termination_date: '',
      bgc_expiration_date: '',
      status: 'pending'
    } as Record<string, string>;

    const result = mapRowToWorkerValues(row, 0);
    expect(result.errors).toHaveLength(0);
    expect(result.values?.localeAll).toEqual(['en-US', 'es-ES']);
  });

  it('returns errors for invalid entries', () => {
    const row = {
      hr_id: '',
      full_name: '',
      engagement_model: 'unknown',
      worker_role: '',
      email_personal: 'bad-email',
      email_pph: 'bad',
      country_residence: 'USA',
      locale_primary: '',
      locale_all: '',
      hire_date: '01-01-2025',
      rtw_datetime: 'bad',
      supervisor_id: '',
      termination_date: '2025/01/01',
      bgc_expiration_date: '2025/01/01',
      status: 'nope'
    } as Record<string, string>;

    const result = mapRowToWorkerValues(row, 1);
    expect(result.values).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
