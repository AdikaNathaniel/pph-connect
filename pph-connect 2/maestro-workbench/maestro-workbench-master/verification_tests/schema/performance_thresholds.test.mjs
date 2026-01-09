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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.performance_thresholds[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.performance_thresholds[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.performance_thresholds`
  );
}

test('performance_thresholds table defines required columns, enums, and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.metric_type/i,
    'Expected metric_type enum to exist'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.threshold_action\s+AS\s+ENUM\s*\(\s*'warn'\s*,\s*'restrict'\s*,\s*'remove'\s*\)/i,
    'Expected threshold_action enum with warn, restrict, remove'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.performance_thresholds/i,
    'Expected migrations to create public.performance_thresholds table'
  );

  const requiredColumns = [
    'project_id',
    'metric_type',
    'threshold_min',
    'threshold_max',
    'grace_period_days',
    'action_on_violation',
    'created_at',
    'created_by'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i,
    'Expected project_id to reference projects'
  );
});

test('performance_thresholds table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_performance_thresholds_project\s+ON\s+public\.performance_thresholds\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_performance_thresholds_metric\s+ON\s+public\.performance_thresholds\s*\(\s*metric_type\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_performance_thresholds_project_metric\s+ON\s+public\.performance_thresholds\s*\(\s*project_id\s*,\s*metric_type\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected performance_thresholds indexes for project, metric, and composite'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.performance_thresholds\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on performance_thresholds'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.performance_thresholds\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on performance_thresholds'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.performance_thresholds[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on performance_thresholds'
  );
});
