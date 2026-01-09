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

function expectColumn(columnName) {
  const patterns = [
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.worker_accounts[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.worker_accounts[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.worker_accounts`
  );
}

test('worker_accounts table defines enums and base columns', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.platform_type\s+AS\s+ENUM\s*\(\s*'DataCompute'\s*,\s*'Maestro'\s*,\s*'Other'\s*\)/i,
    'Expected platform_type enum with DataCompute, Maestro, Other'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_account_status\s+AS\s+ENUM\s*\(\s*'active'\s*,\s*'inactive'\s*,\s*'replaced'\s*\)/i,
    'Expected worker_account_status enum with active, inactive, replaced'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_accounts/i,
    'Expected migrations to create public.worker_accounts table'
  );

  const requiredColumns = [
    'worker_id',
    'worker_account_email',
    'worker_account_id',
    'platform_type',
    'status',
    'is_current',
    'activated_at',
    'deactivated_at',
    'deactivation_reason',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by'
  ];

  requiredColumns.forEach(expectColumn);
});

test('worker_accounts table enforces uniqueness and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*worker_id\s*,\s*platform_type\s*\)\s+WHERE\s+is_current\s*=\s*true/i,
    'Expected partial unique constraint on (worker_id, platform_type) where is_current is true'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_accounts_worker\s+ON\s+public\.worker_accounts\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_accounts_current\s+ON\s+public\.worker_accounts\s*\(\s*worker_id\s*\)\s+WHERE\s+is_current\s*=\s*true/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected worker_accounts indexes for worker lookup and current account filter'
    );
  });
});

test('worker_accounts table enforces RLS and admin-only write access', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_accounts\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS to be enabled on worker_accounts'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_accounts\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected SELECT policy for authenticated users'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_accounts[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on worker_accounts'
  );
});

test('worker_accounts table validates status and current flags', () => {
  assert.match(
    combinedSql,
    /CONSTRAINT\s+worker_accounts_active_current_check[\s\S]+status\s+<>\s+'active'[\s\S]+is_current\s*=\s*true/i,
    'Expected CHECK ensuring active accounts remain current'
  );

  assert.match(
    combinedSql,
    /CONSTRAINT\s+worker_accounts_deactivated_at_check[\s\S]+deactivated_at\s+IS\s+NULL\s+OR\s+status\s+<>\s+'active'/i,
    'Expected CHECK ensuring deactivated_at not populated for active accounts'
  );
});
