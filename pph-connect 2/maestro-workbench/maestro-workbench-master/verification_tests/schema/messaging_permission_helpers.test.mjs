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

const canMessageUserSqlMatch = combinedSql.match(
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.can_message_user[\s\S]+?END;\s*\$\$/i
);

const canMessageUserSql = canMessageUserSqlMatch?.[0] ?? '';

test('can_message_user helper references workers hierarchy instead of profiles', () => {
  assert.notEqual(
    canMessageUserSql,
    '',
    'Expected migrations to include can_message_user function definition'
  );

  assert.match(
    canMessageUserSql,
    /FROM\s+public\.workers\b/i,
    'Expected can_message_user to query public.workers'
  );

  assert.match(
    canMessageUserSql,
    /SELECT\s+worker_role\s*,\s*department_id\s*,\s*supervisor_id\s*,\s*status/i,
    'Expected can_message_user to load worker role, department, supervisor, and status state'
  );

  assert.doesNotMatch(
    canMessageUserSql,
    /FROM\s+public\.profiles\b/i,
    'Expected can_message_user to avoid querying public.profiles'
  );
});
