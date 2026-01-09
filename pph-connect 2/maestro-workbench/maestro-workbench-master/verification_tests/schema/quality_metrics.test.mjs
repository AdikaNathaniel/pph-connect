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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.quality_metrics[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.quality_metrics[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.quality_metrics`
  );
}

test('quality_metrics table defines required columns, enum, and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.metric_type\s+AS\s+ENUM\s*\(\s*'accuracy'\s*,\s*'speed'\s*,\s*'consistency'\s*,\s*'quality'\s*,\s*'productivity'\s*\)/i,
    'Expected metric_type enum with accuracy, speed, consistency, quality, productivity'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.quality_metrics/i,
    'Expected migrations to create public.quality_metrics table'
  );

  const requiredColumns = [
    'worker_id',
    'project_id',
    'metric_type',
    'metric_value',
    'rolling_avg_7d',
    'rolling_avg_30d',
    'percentile_rank',
    'measured_at',
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
});

test('quality_metrics table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_metrics_worker\s+ON\s+public\.quality_metrics\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_metrics_project\s+ON\s+public\.quality_metrics\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_metrics_type\s+ON\s+public\.quality_metrics\s*\(\s*metric_type\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_metrics_worker_project_type_measured\s+ON\s+public\.quality_metrics\s*\(\s*worker_id\s*,\s*project_id\s*,\s*metric_type\s*,\s*measured_at\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected quality_metrics indexes including composite worker/project/type/measured_at'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.quality_metrics\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on quality_metrics'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.quality_metrics\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on quality_metrics'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.quality_metrics[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on quality_metrics'
  );
});
