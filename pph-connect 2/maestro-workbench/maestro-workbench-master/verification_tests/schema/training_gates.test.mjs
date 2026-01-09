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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.training_gates[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.training_gates[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.training_gates`
  );
}

test('training_gates table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.training_gates/i,
    'Expected migrations to create public.training_gates table'
  );

  const requiredColumns = [
    'worker_id',
    'project_id',
    'gate_name',
    'status',
    'score',
    'attempt_count',
    'passed_at',
    'created_at',
    'updated_at'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i,
    'Expected project_id to reference projects'
  );
});

test('training_gates table enforces unique constraint and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*worker_id\s*,\s*project_id\s*,\s*gate_name\s*\)/i,
    'Expected unique constraint on (worker_id, project_id, gate_name)'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_training_gates_worker\s+ON\s+public\.training_gates\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_training_gates_project\s+ON\s+public\.training_gates\s*\(\s*project_id\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected training_gates indexes for worker_id and project_id'
    );
  });
});

test('training_gates table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.training_gates\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on training_gates'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.training_gates\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on training_gates'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.training_gates[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on training_gates'
  );
});
