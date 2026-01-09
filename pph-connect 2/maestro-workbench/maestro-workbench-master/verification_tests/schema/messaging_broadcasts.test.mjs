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

test('messages table supports delivery type enum for broadcast', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.message_delivery_type\s+AS\s+ENUM\s*\(\s*'direct'\s*,\s*'broadcast'\s*\)/i,
    'Expected message_delivery_type enum with direct and broadcast'
  );

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.messages[\s\S]+delivery_type\s+public\.message_delivery_type/i,
    'Expected messages table to introduce delivery_type column of message_delivery_type'
  );

  assert.match(
    combinedSql,
    /delivery_type\s+public\.message_delivery_type[^\n]*DEFAULT\s+'direct'/i,
    'Expected delivery_type to default to direct'
  );
});

test('message_broadcast_runs table tracks broadcast deliveries', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.message_broadcast_status\s+AS\s+ENUM\s*\(\s*'pending'\s*,\s*'processing'\s*,\s*'completed'\s*,\s*'failed'\s*\)/i,
    'Expected message_broadcast_status enum'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.message_broadcast_runs/i,
    'Expected message_broadcast_runs table to be created'
  );

  const fkExpectations = [
    { column: 'thread_id', target: 'public\\.message_threads' },
    { column: 'message_id', target: 'public\\.messages' },
    { column: 'audience_target_id', target: 'public\\.message_audience_targets' },
    { column: 'run_by', target: 'public\\.workers' }
  ];

  fkExpectations.forEach(({ column, target }) => {
    assert.match(
      combinedSql,
      new RegExp(`${column}\\s+[^\n]*REFERENCES\\s+${target}\\s*\\(\\s*id\\s*\\)`, 'i'),
      `Expected message_broadcast_runs.${column} to reference ${target}`
    );
  });

  const requiredColumns = [
    'status',
    'summary',
    'run_at',
    'created_at'
  ];

  requiredColumns.forEach((column) => {
    assert.match(
      combinedSql,
      new RegExp(`\\b${column}\\b`, 'i'),
      `Expected message_broadcast_runs to include ${column}`
    );
  });

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_message_broadcast_runs_thread\s+ON\s+public\.message_broadcast_runs\s*\(\s*thread_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_message_broadcast_runs_status\s+ON\s+public\.message_broadcast_runs\s*\(\s*status\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected message_broadcast_runs indexes for thread and status'
    );
  });
});
