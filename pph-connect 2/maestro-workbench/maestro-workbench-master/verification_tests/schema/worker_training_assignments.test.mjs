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

const expectPattern = (pattern, message) => assert.match(combinedSql, pattern, message);
const tableBlock = (() => {
  const match = combinedSql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_training_assignments\s*\(([\s\S]+?)\)\s*;/i,
  );
  return match ? match[1] : '';
})();

test('worker_training_assignments table defines columns and constraints', () => {
  expectPattern(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_training_assignments/i,
    'Expected worker_training_assignments table',
  );
  ['worker_id', 'training_module_id', 'status', 'assigned_at'].forEach((column) => {
    assert.match(tableBlock, new RegExp(`${column}`, 'i'), `Expected ${column} column`);
  });
  assert.match(tableBlock, /REFERENCES\s+public\.workers/i, 'Expected FK to workers');
  assert.match(tableBlock, /REFERENCES\s+public\.training_modules/i, 'Expected FK to training modules');
  expectPattern(/UNIQUE\s*\(\s*worker_id\s*,\s*training_module_id\s*\)/i, 'Expected unique constraint per worker/module');
});

test('worker_training_assignments enforces indexes and RLS policies', () => {
  expectPattern(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_training_assignments_worker/i,
    'Expected worker index',
  );
  expectPattern(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled on assignments table');
  expectPattern(
    /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.worker_training_assignments[\s\S]+worker_has_role/i,
    'Expected policy referencing worker_has_role helper',
  );
});
