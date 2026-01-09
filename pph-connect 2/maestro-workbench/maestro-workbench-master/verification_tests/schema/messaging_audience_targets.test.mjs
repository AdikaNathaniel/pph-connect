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

test('message_audience_targets table supports department and team targeting', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.message_audience_targets/i,
    'Expected migrations to create public.message_audience_targets table'
  );

  assert.match(
    combinedSql,
    /thread_id\s+[^\n]*REFERENCES\s+public\.message_threads\s*\(\s*id\s*\)/i,
    'Expected message_audience_targets.thread_id to reference message_threads'
  );

  assert.match(
    combinedSql,
    /department_id\s+[^\n]*REFERENCES\s+public\.departments\s*\(\s*id\s*\)/i,
    'Expected message_audience_targets.department_id to reference departments'
  );

  assert.match(
    combinedSql,
    /team_id\s+[^\n]*REFERENCES\s+public\.teams\s*\(\s*id\s*\)/i,
    'Expected message_audience_targets.team_id to reference teams'
  );

  assert.match(
    combinedSql,
    /CHECK\s*\(\s*department_id\s+IS\s+NOT\s+NULL\s+OR\s+team_id\s+IS\s+NOT\s+NULL\s*\)/i,
    'Expected message_audience_targets to enforce department or team presence'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_message_audience_targets_thread\s+ON\s+public\.message_audience_targets\s*\(\s*thread_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_message_audience_targets_department\s+ON\s+public\.message_audience_targets\s*\(\s*department_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_message_audience_targets_team\s+ON\s+public\.message_audience_targets\s*\(\s*team_id\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected message_audience_targets indexes on thread, department, and team'
    );
  });
});
