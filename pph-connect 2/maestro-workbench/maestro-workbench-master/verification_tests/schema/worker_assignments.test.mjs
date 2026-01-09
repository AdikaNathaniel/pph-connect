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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.worker_assignments[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.worker_assignments[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.worker_assignments`
  );
}

test('worker_assignments table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_assignments/i,
    'Expected migrations to create public.worker_assignments table'
  );

  const requiredColumns = [
    'worker_id',
    'project_id',
    'assigned_at',
    'assigned_by',
    'removed_at',
    'removed_by',
    'removal_reason'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i,
    'Expected project_id to reference projects'
  );
});

test('worker_assignments table enforces indexes and soft-delete coverage', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_assignments_worker\s+ON\s+public\.worker_assignments\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_assignments_project\s+ON\s+public\.worker_assignments\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_assignments_active\s+ON\s+public\.worker_assignments\s*\(\s*worker_id\s*\)\s+WHERE\s+removed_at\s+IS\s+NULL/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected worker_assignments indexes for worker, project, and active assignments'
    );
  });
});

test('worker_assignments table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_assignments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on worker_assignments'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_assignments\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on worker_assignments'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_assignments[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on worker_assignments'
  );
});
