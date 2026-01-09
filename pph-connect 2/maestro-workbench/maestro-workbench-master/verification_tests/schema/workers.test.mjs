import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function readAllMigrations() {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return sqlFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readAllMigrations();

function expectColumn(columnName) {
  const patterns = [
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.workers[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.workers[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.workers`
  );
}

test('workers table defines required columns and enums', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.engagement_model\s+AS\s+ENUM\s*\(\s*'core'\s*,\s*'upwork'\s*,\s*'external'\s*,\s*'internal'\s*\)/i,
    'Expected engagement_model enum with core, upwork, external, internal'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_status\s+AS\s+ENUM\s*\(\s*'pending'\s*,\s*'active'\s*,\s*'inactive'\s*,\s*'terminated'\s*\)/i,
    'Expected worker_status enum with pending, active, inactive, terminated'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.workers/i,
    'Expected migrations to create public.workers table'
  );

  const requiredColumns = [
    'id',
    'hr_id',
    'full_name',
    'engagement_model',
    'worker_role',
    'email_personal',
    'email_pph',
    'country_residence',
    'locale_primary',
    'locale_all',
    'hire_date',
    'rtw_datetime',
    'supervisor_id',
    'termination_date',
    'bgc_expiration_date',
    'status',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by'
  ];

  requiredColumns.forEach(expectColumn);
});

test('workers table defines unique constraints', () => {
  const patterns = [
    /UNIQUE\s*\(\s*hr_id\s*\)/i,
    /UNIQUE\s*\(\s*email_personal\s*\)/i,
    /UNIQUE\s*\(\s*email_pph\s*\)/i
  ];

  patterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected migrations to add required UNIQUE constraints on workers table'
    );
  });
});

test('workers table defines required indexes', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_workers_hr_id\s+ON\s+public\.workers\s*\(\s*hr_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_workers_status\s+ON\s+public\.workers\s*\(\s*status\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_workers_supervisor\s+ON\s+public\.workers\s*\(\s*supervisor_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_workers_email\s+ON\s+public\.workers\s*\(\s*email_personal\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected migrations to create required workers indexes'
    );
  });
});

test('workers table enforces RLS and admin-only mutations', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.workers\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS to be enabled on public.workers'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.workers\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected SELECT policy for authenticated users on workers'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.workers[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on workers'
  );
});

test('workers table check constraints prevent self-supervision and enforce status requirements', () => {
  assert.match(
    combinedSql,
    /CONSTRAINT\s+workers_no_self_supervision_check[\s\S]+supervisor_id\s+IS\s+NULL\s+OR\s+supervisor_id\s*<>\s*id/i,
    'Expected CHECK constraint preventing workers supervising themselves'
  );

  assert.match(
    combinedSql,
    new RegExp("CONSTRAINT\\s+workers_status_requirements_check[\\s\\S]+status\\s*=\\s*'pending'[\\s\\S]+status\\s*IN\\s*\\(\\s*'active'\\s*,\\s*'inactive'\\s*\\)[\\s\\S]+status\\s*=\\s*'terminated'", 'i'),
    'Expected CHECK constraint enforcing worker status requirements and transitions'
  );
});
