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

test('tasks status check includes needs_review', () => {
  expectMatch(/needs_review/i, 'Expected needs_review keyword in migrations');
});

test('task_reassignment_events table defined with foreign keys and indexes', () => {
  expectMatch(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.task_reassignment_events/i,
    'Expected task_reassignment_events table definition'
  );
  ['task_id', 'from_worker_id', 'to_worker_id', 'reason', 'created_at'].forEach((column) => {
    expectMatch(
      new RegExp(`task_reassignment_events[\\s\\S]+${column}`, 'i'),
      `Expected column ${column}`
    );
  });
  expectMatch(
    /task_id\s+[^\n]+REFERENCES\s+public\.tasks/i,
    'Expected task_id foreign key'
  );
  expectMatch(
    /from_worker_id\s+[^\n]+REFERENCES\s+public\.workers/i,
    'Expected from_worker_id foreign key'
  );
  expectMatch(
    /to_worker_id\s+[^\n]+REFERENCES\s+public\.workers/i,
    'Expected to_worker_id foreign key'
  );
  expectMatch(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_task_reassignment_task/i,
    'Expected task index'
  );
  expectMatch(
    /ALTER\s+TABLE\s+public\.task_reassignment_events\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on task_reassignment_events'
  );
});
