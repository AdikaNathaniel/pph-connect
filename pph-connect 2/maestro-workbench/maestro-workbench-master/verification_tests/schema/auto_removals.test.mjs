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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.auto_removals[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.auto_removals[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.auto_removals`
  );
}

test('auto_removals table defines required columns, enums, and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.appeal_status\s+AS\s+ENUM\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'denied'\s*\)/i,
    'Expected appeal_status enum with pending, approved, denied'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.auto_removals/i,
    'Expected migrations to create public.auto_removals table'
  );

  const requiredColumns = [
    'worker_id',
    'project_id',
    'removal_reason',
    'metrics_snapshot',
    'removed_at',
    'can_appeal',
    'appeal_status',
    'appeal_message',
    'appeal_submitted_at',
    'appeal_reviewed_by',
    'appeal_decision_at',
    'appeal_decision_notes',
    'created_at'
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

  assert.match(
    combinedSql,
    /appeal_reviewed_by\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected appeal_reviewed_by to reference workers for audit'
  );
});

test('auto_removals table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_auto_removals_worker\s+ON\s+public\.auto_removals\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_auto_removals_project\s+ON\s+public\.auto_removals\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_auto_removals_status\s+ON\s+public\.auto_removals\s*\(\s*appeal_status\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected auto_removals indexes for worker, project, and status'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.auto_removals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on auto_removals'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.auto_removals\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on auto_removals'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.auto_removals[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on auto_removals'
  );
});
