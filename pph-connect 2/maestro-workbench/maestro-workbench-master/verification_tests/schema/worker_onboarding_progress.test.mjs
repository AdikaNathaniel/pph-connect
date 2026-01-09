import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

const combinedSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

const expectColumn = (columnName) => {
  const pattern = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.worker_onboarding_progress[\\s\\S]+${columnName}`,
    'i'
  );
  assert.match(combinedSql, pattern, `Expected column ${columnName} on worker_onboarding_progress`);
};

test('worker_onboarding_progress table defines core columns and constraints', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_onboarding_progress/i,
    'Expected worker_onboarding_progress table definition'
  );

  ['worker_id', 'step_id', 'status', 'completed_at', 'metadata', 'created_at'].forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]+REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected FK to workers'
  );

  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*worker_id\s*,\s*step_id\s*\)/i,
    'Expected unique constraint per worker/step'
  );
});

test('worker_onboarding_progress enforces indexes and RLS', () => {
  assert.match(
    combinedSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_onboarding_progress_worker\s+ON\s+public\.worker_onboarding_progress\s*\(\s*worker_id\s*\)/i,
    'Expected worker index'
  );
  assert.match(
    combinedSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_onboarding_progress_step\s+ON\s+public\.worker_onboarding_progress\s*\(\s*step_id\s*\)/i,
    'Expected step index'
  );
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_onboarding_progress\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled'
  );
  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_onboarding_progress\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy'
  );
  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_onboarding_progress[\s\S]+worker_has_role/i,
    'Expected admin/manager write policy'
  );
});
