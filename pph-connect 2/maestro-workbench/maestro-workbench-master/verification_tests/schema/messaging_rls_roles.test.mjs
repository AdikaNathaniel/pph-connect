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

test('worker_has_role helper exists for messaging RLS', () => {
  assert.match(
    combinedSql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.worker_has_role/i,
    'Expected worker_has_role helper function'
  );

  assert.match(
    combinedSql,
    /worker_has_role\s*\(\s*auth\.uid\(\)/i,
    'Expected messaging policies to invoke worker_has_role(auth.uid())'
  );
});
