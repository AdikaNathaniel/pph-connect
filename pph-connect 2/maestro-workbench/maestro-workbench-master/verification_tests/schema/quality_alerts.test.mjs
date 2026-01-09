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

test('quality_alerts table schema', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.quality_alerts/i,
    'Expected quality_alerts table create statement'
  );
  ['id', 'alert_type', 'project_id', 'worker_id', 'metric_value', 'threshold', 'message', 'created_at'].forEach((column) => {
    assert.match(
      combinedSql,
      new RegExp(`quality_alerts[\\s\\S]+${column}`, 'i'),
      `Expected column ${column}`
    );
  });
  assert.match(
    combinedSql,
    /project_id\s+[^\n]+REFERENCES\s+public\.projects/i,
    'Expected project foreign key'
  );
});

test('quality_alerts indexes and policies', () => {
  assert.match(
    combinedSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_alerts_project/i,
    'Expected project index'
  );
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.quality_alerts\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled'
  );
  assert.match(
    combinedSql,
    /Authenticated users can read quality alerts/i,
    'Expected read policy'
  );
});
