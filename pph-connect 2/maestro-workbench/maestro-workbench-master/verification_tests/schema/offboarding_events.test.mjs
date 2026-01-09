import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const combinedSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

const expect = (pattern, message) => assert.match(combinedSql, pattern, message);

test('offboarding_events table defines columns and constraints', () => {
  expect(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.offboarding_events/i, 'Expected offboarding_events table');
  ['worker_id', 'step', 'status', 'completed_at', 'metadata'].forEach((column) =>
    expect(new RegExp(`offboarding_events[\\s\\S]+${column}`, 'i'), `Expected ${column} column`),
  );
  expect(/worker_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.workers/i, 'Expected worker FK');
});

test('offboarding_events enforces indexes and policies', () => {
  expect(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_offboarding_events_worker/i, 'Expected worker index');
  expect(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled on offboarding_events');
  expect(/CREATE\s+POLICY\s+"Workers view their offboarding events"/i, 'Expected worker view policy');
  expect(/CREATE\s+POLICY\s+"Admins manage offboarding events"/i, 'Expected admin manage policy');
});
