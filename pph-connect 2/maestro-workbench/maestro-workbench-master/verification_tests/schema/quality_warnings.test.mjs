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

const expectMatch = (pattern, message) => {
  assert.match(combinedSql, pattern, message);
};

test('quality_warnings table defines columns and relationships', () => {
  expectMatch(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.quality_warnings/i,
    'Expected quality_warnings table creation'
  );

  [
    'worker_id',
    'project_id',
    'current_score',
    'threshold',
    'recommended_actions',
    'resolution_due',
    'message_subject',
    'created_at',
    'created_by',
    'resolved_at'
  ].forEach((column) => {
    expectMatch(
      new RegExp(`quality_warnings[\\s\\S]+${column}`, 'i'),
      `Expected column ${column}`
    );
  });

  expectMatch(
    /worker_id\s+[^\n]+REFERENCES\s+public\.workers/i,
    'Expected worker_id foreign key'
  );

  expectMatch(
    /project_id\s+[^\n]+REFERENCES\s+public\.projects/i,
    'Expected project_id foreign key'
  );
});

test('quality_warnings has indexes and RLS policies', () => {
  expectMatch(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_warnings_worker\s+ON\s+public\.quality_warnings\s*\(\s*worker_id\s*\)/i,
    'Expected worker index'
  );
  expectMatch(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_quality_warnings_project\s+ON\s+public\.quality_warnings\s*\(\s*project_id\s*\)/i,
    'Expected project index'
  );
  expectMatch(
    /ALTER\s+TABLE\s+public\.quality_warnings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled'
  );
  expectMatch(
    /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.quality_warnings\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy'
  );
  expectMatch(
    /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.quality_warnings\s+FOR\s+ALL\s+TO\s+authenticated/i,
    'Expected admin manage policy'
  );
});
