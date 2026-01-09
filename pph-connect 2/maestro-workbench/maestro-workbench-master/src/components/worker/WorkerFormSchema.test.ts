import { describe, it, expect } from 'vitest';
import { workerFormSchema } from './WorkerForm';

const baseValues = {
  hrId: 'HR-1',
  fullName: 'Test User',
  engagementModel: 'core',
  workerRole: 'Reviewer',
  emailPersonal: 'test@example.com',
  emailPph: 'test@pphconnect.com',
  countryResidence: 'US',
  localePrimary: 'en-US',
  localeAll: ['en-US'],
  hireDate: '2025-01-01',
  rtwDateTime: '2025-01-01T09:00',
  supervisorId: 'sup-1',
  terminationDate: '',
  bgcExpirationDate: '',
  status: 'active',
};

describe('workerFormSchema', () => {
  it('accepts valid values', () => {
    expect(() => workerFormSchema.parse(baseValues)).not.toThrow();
  });

  it('rejects invalid emails and engagement model', () => {
    expect(() =>
      workerFormSchema.parse({
        ...baseValues,
        emailPersonal: 'bad',
        engagementModel: 'invalid',
      })
    ).toThrow();
  });

  it('allows optional fields to be empty strings', () => {
    expect(() =>
      workerFormSchema.parse({
        ...baseValues,
        workerRole: '',
        emailPph: '',
        rtwDateTime: '',
      })
    ).not.toThrow();
  });
});
