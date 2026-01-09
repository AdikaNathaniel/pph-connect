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

function expectReference(table, column, targetTable) {
  assert.match(
    combinedSql,
    new RegExp(`${table}\\s*[^(]*\\([^)]*${column}[^\\n]*REFERENCES\\s+${targetTable}`, 'i'),
    `Expected ${table}.${column} to reference ${targetTable}`
  );
}

test('messaging tables reference workers instead of profiles', () => {
  expectReference('public\\.message_threads', 'created_by', 'public\\.workers\\s*\\(\\s*id\\s*\\)');
  expectReference('public\\.messages', 'sender_id', 'public\\.workers\\s*\\(\\s*id\\s*\\)');
  expectReference('public\\.message_recipients', 'recipient_id', 'public\\.workers\\s*\\(\\s*id\\s*\\)');
  expectReference('public\\.message_groups', 'created_by', 'public\\.workers\\s*\\(\\s*id\\s*\\)');
  expectReference('public\\.group_members', 'user_id', 'public\\.workers\\s*\\(\\s*id\\s*\\)');
});
