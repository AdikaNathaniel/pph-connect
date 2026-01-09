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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.worker_training_access[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.worker_training_access[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.worker_training_access`
  );
}

test('worker_training_access table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_training_access/i,
    'Expected migrations to create public.worker_training_access table'
  );

  const requiredColumns = [
    'worker_id',
    'training_material_id',
    'granted_at',
    'completed_at'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );

  assert.match(
    combinedSql,
    /training_material_id\s+[^\n]*REFERENCES\s+public\.training_materials\s*\(\s*id\s*\)/i,
    'Expected training_material_id to reference training_materials'
  );
});

test('worker_training_access table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_training_access_worker\s+ON\s+public\.worker_training_access\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_training_access_material\s+ON\s+public\.worker_training_access\s*\(\s*training_material_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_training_access_active\s+ON\s+public\.worker_training_access\s*\(\s*worker_id\s*\)\s+WHERE\s+completed_at\s+IS\s+NULL/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected indexes on worker_training_access for worker, material, and active records'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_training_access\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on worker_training_access'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_training_access\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on worker_training_access'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.worker_training_access[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on worker_training_access'
  );
});
