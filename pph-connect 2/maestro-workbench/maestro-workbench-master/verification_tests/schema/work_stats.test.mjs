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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.work_stats[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.work_stats[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.work_stats`
  );
}

test('work_stats table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.work_stats/i,
    'Expected migrations to create public.work_stats table'
  );

  const requiredColumns = [
    'worker_id',
    'worker_account_id',
    'project_id',
    'work_date',
    'units_completed',
    'hours_worked',
    'earnings',
    'created_at',
    'created_by'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );

  assert.match(
    combinedSql,
    /worker_account_id\s+[^\n]*REFERENCES\s+public\.worker_accounts\s*\(\s*id\s*\)/i,
    'Expected worker_account_id to reference worker_accounts'
  );

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i,
    'Expected project_id to reference projects'
  );
});

test('work_stats table enforces unique constraint and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*worker_account_id\s*,\s*project_id\s*,\s*work_date\s*\)/i,
    'Expected unique constraint on (worker_account_id, project_id, work_date)'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_work_stats_worker\s+ON\s+public\.work_stats\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_work_stats_project\s+ON\s+public\.work_stats\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_work_stats_date\s+ON\s+public\.work_stats\s*\(\s*work_date\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_work_stats_account\s+ON\s+public\.work_stats\s*\(\s*worker_account_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_work_stats_recent\s+ON\s+public\.work_stats\s*\(\s*work_date\s+DESC\s*,\s*worker_id\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected work_stats indexes for worker, project, date, and account'
    );
  });
});

test('work_stats table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.work_stats\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on work_stats'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.work_stats\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on work_stats'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.work_stats[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on work_stats'
  );
});
