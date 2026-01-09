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

test('achievements table exists with required columns', () => {
  [
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.achievements/i,
    /name\s+text\s+NOT\s+NULL/i,
    /criteria\s+jsonb\s+NOT\s+NULL/i,
    /icon\s+text\s+NOT\s+NULL/i,
  ].forEach((pattern) => {
    assert.match(combinedSql, pattern, `Expected achievements table definition pattern ${pattern}`);
  });
});

test('worker_achievements table exists with foreign keys', () => {
  [
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_achievements/i,
    /worker_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.workers/i,
    /achievement_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.achievements/i,
    /earned_at\s+timestamptz\s+NOT\s+NULL/i,
  ].forEach((pattern) => {
    assert.match(combinedSql, pattern, `Expected worker_achievements definition pattern ${pattern}`);
  });
  assert.match(
    combinedSql,
    /CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?idx_worker_achievements_unique\s+ON\s+public\.worker_achievements/i,
    'Expected unique index for worker achievements'
  );
});
