import { supabase } from '@/integrations/supabase/client';

export type StatsRow = {
  worker_account_email: string;
  project_code: string;
  work_date: string;
  units_completed: number;
  hours_worked: number;
};

export type StatsValidationMessage = {
  id: string;
  row: number;
  level: 'error' | 'warning';
  message: string;
};

export interface StatsValidationResult {
  messages: StatsValidationMessage[];
  isValid: boolean;
}

const normalizeString = (value: string) => value.trim().toLowerCase();

const isPositiveNumber = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return false;
};

const isValidISODate = (value: string): boolean => {
  if (!value) {
    return false;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return value === parsed.toISOString().slice(0, 10);
};

const ensureWorkerAccountsExist = async (emails: string[]) => {
  if (emails.length === 0) {
    return new Set<string>();
  }
  const { data } = await supabase
    .from('worker_accounts')
    .select('worker_account_email')
    .in('worker_account_email', emails);
  return new Set((data ?? []).map((row) => normalizeString(row.worker_account_email)));
};

const ensureProjectsExist = async (projectCodes: string[]) => {
  if (projectCodes.length === 0) {
    return new Set<string>();
  }
  const { data } = await supabase
    .from('projects')
    .select('project_code')
    .in('project_code', projectCodes);
  return new Set((data ?? []).map((row) => normalizeString(row.project_code)));
};

const findDuplicateKeys = (rows: StatsRow[]) => {
  const seen = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const key = `${normalizeString(row.worker_account_email)}|${normalizeString(row.project_code)}|${row.work_date}`;
    seen.set(key, [...(seen.get(key) ?? []), index]);
  });
  return Array.from(seen.entries()).filter(([, indices]) => indices.length > 1);
};

export const validateStatsRows = async (rows: StatsRow[]): Promise<StatsValidationResult> => {
  const messages: StatsValidationMessage[] = [];

  const emails = Array.from(new Set(rows.map((row) => normalizeString(row.worker_account_email)).filter(Boolean)));
  const projects = Array.from(new Set(rows.map((row) => normalizeString(row.project_code)).filter(Boolean)));

  const [validEmails, validProjects] = await Promise.all([
    ensureWorkerAccountsExist(emails),
    ensureProjectsExist(projects)
  ]);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.worker_account_email || !validEmails.has(normalizeString(row.worker_account_email))) {
      messages.push({
        id: `missing-email-${index}`,
        row: rowNumber,
        level: 'error',
        message: `Unknown worker_account_email "${row.worker_account_email}".`
      });
    }
    if (!row.project_code || !validProjects.has(normalizeString(row.project_code))) {
      messages.push({
        id: `missing-project-${index}`,
        row: rowNumber,
        level: 'error',
        message: `Unknown project_code "${row.project_code}".`
      });
    }
    if (!isValidISODate(row.work_date)) {
      messages.push({
        id: `invalid-date-${index}`,
        row: rowNumber,
        level: 'error',
        message: `work_date must be a valid ISO date (YYYY-MM-DD).`
      });
    }
    if (!isPositiveNumber(row.units_completed)) {
      messages.push({
        id: `invalid-units-${index}`,
        row: rowNumber,
        level: 'error',
        message: `units_completed must be a positive number.`
      });
    }
    if (!isPositiveNumber(row.hours_worked)) {
      messages.push({
        id: `invalid-hours-${index}`,
        row: rowNumber,
        level: 'error',
        message: `hours_worked must be a positive number.`
      });
    }
  });

  const duplicates = findDuplicateKeys(rows);
  duplicates.forEach(([key, indices]) => {
    messages.push({
      id: `duplicate-${key}`,
      row: Math.min(...indices.map((idx) => idx + 2)),
      level: 'error',
      message: 'Duplicate record detected for worker, project, and date combination.'
    });
  });

  return {
    messages,
    isValid: messages.every((message) => message.level !== 'error')
  };
};

export default validateStatsRows;
