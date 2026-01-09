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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.worker_applications[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.worker_applications[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.worker_applications`
  );
}

test('worker_applications table defines required columns, enums, and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.application_status\s+AS\s+ENUM\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'rejected'\s*\)/i,
    'Expected application_status enum with pending, approved, rejected'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_applications/i,
    'Expected migrations to create public.worker_applications table'
  );

  const requiredColumns = [
    'worker_id',
    'project_listing_id',
    'status',
    'applied_at',
    'reviewed_at',
    'reviewed_by',
    'notes',
    'created_at',
    'updated_at'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );

  assert.match(
    combinedSql,
    /project_listing_id\s+[^\n]*REFERENCES\s+public\.project_listings\s*\(\s*id\s*\)/i,
    'Expected project_listing_id to reference project_listings'
  );
});

test('worker_applications table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_applications_worker\s+ON\s+public\.worker_applications\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_applications_listing\s+ON\s+public\.worker_applications\s*\(\s*project_listing_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_applications_status\s+ON\s+public\.worker_applications\s*\(\s*status\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected worker_applications indexes for worker, listing, and status'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_applications\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on worker_applications'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_applications\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on worker_applications'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_applications[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on worker_applications'
  );
});
