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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.skill_assessments[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.skill_assessments[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.skill_assessments`
  );
}

test('skill_assessments table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.skill_assessments/i,
    'Expected migrations to create public.skill_assessments table'
  );

  const requiredColumns = [
    'worker_id',
    'skill_name',
    'assessment_type',
    'score',
    'passed',
    'taken_at',
    'expires_at',
    'created_at',
    'metadata'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+[^\n]*REFERENCES\s+public\.workers\s*\(\s*id\s*\)/i,
    'Expected worker_id to reference workers'
  );
});

test('skill_assessments table enforces indexes and RLS policies', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_skill_assessments_worker\s+ON\s+public\.skill_assessments\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_skill_assessments_skill\s+ON\s+public\.skill_assessments\s*\(\s*skill_name\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected skill_assessments indexes for worker and skill'
    );
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.skill_assessments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on skill_assessments'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.skill_assessments\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on skill_assessments'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.skill_assessments[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on skill_assessments'
  );
});
