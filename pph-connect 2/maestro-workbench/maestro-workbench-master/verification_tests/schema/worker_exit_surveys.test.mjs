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

test('worker_exit_surveys table defines required columns and constraints', () => {
  expect(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_exit_surveys/i, 'Expected worker_exit_surveys table');
  ['worker_id', 'reason', 'overall_rating', 'improvement_suggestions', 'would_recommend', 'additional_feedback', 'submitted_at'].forEach(
    (column) => expect(new RegExp(`${column}`, 'i'), `Expected ${column} column`),
  );
  expect(/worker_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.workers/i, 'Expected worker FK');
  expect(/CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?idx_worker_exit_surveys_worker/i, 'Expected unique index per worker');
});

test('worker_exit_surveys enforces indexes and policies', () => {
  expect(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled on worker_exit_surveys');
  expect(/CREATE\s+POLICY\s+"Workers can submit exit survey"/i, 'Expected worker insert policy');
  expect(/CREATE\s+POLICY\s+"Admins can view exit surveys"/i, 'Expected admin read policy');
});
