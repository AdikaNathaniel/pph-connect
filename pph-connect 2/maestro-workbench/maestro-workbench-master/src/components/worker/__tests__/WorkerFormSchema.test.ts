import { describe, it, expect } from 'vitest';
import { workerFormSchema } from '../WorkerForm';

const basePayload = {
  hrId: 'HR-100',
  fullName: 'Test Worker',
  engagementModel: 'core',
  workerRole: 'Reviewer',
  emailPersonal: 'worker@example.com',
  emailPph: 'worker@pphconnect.test',
  countryResidence: 'US',
  localePrimary: 'en-US',
  localeAll: ['en-US'],
  hireDate: '2025-01-01',
  rtwDateTime: '',
  supervisorId: '',
  terminationDate: '',
  bgcExpirationDate: '',
  status: 'active',
};

describe('workerFormSchema', () => {
  it('accepts a fully populated worker payload', () => {
    const result = workerFormSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it('rejects payloads with missing required fields', () => {
    const invalid = { ...basePayload, emailPersonal: 'bad-email', localeAll: [] };
    const result = workerFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.path.join('.'));
      expect(issues).toContain('emailPersonal');
      expect(issues).toContain('localeAll');
    }
  });
});
