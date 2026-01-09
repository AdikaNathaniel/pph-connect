import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const remoteSchemaPath = path.join(migrationsDir, '20251029110038_remote_schema.sql');

function readAllMigrations() {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return sqlFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readAllMigrations();
const remoteSchemaSql = readFileSync(remoteSchemaPath, 'utf8');

const expectPattern = (pattern, message) => {
  assert.match(combinedSql, pattern, message);
};

test('questions table defines gold standard fields', () => {
  expectPattern(
    /ALTER\s+TABLE\s+public\.questions[\s\S]+ADD\s+COLUMN[\s\S]+is_gold_standard\s+boolean/i,
    'Expected migration adding is_gold_standard column'
  );

  expectPattern(
    /is_gold_standard\s+boolean\s+DEFAULT\s+false\s+NOT\s+NULL/i,
    'Expected is_gold_standard default false not null'
  );

  expectPattern(
    /ADD\s+COLUMN[\s\S]+correct_answer\s+jsonb/i,
    'Expected migration adding correct_answer column'
  );
});

test('questions table has gold standard index for selection', () => {
  expectPattern(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_questions_gold_standard\s+ON\s+public\.questions\s*\(\s*project_id\s*\)\s+WHERE\s+is_gold_standard\s+IS\s+TRUE/i,
    'Expected partial index for gold standard questions'
  );
});

test('base remote schema seeds gold standard columns', () => {
  assert.match(
    remoteSchemaSql,
    /"is_gold_standard"\s+boolean\s+DEFAULT\s+false\s+NOT\s+NULL/i,
    'Expected base schema to include is_gold_standard column'
  );

  assert.match(
    remoteSchemaSql,
    /"correct_answer"\s+"?jsonb"?/i,
    'Expected base schema to include correct_answer column'
  );

  assert.match(
    remoteSchemaSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"?idx_questions_gold_standard"?[\s\S]+WHERE\s+is_gold_standard\s+IS\s+TRUE/i,
    'Expected base schema to seed partial index for gold standards'
  );
});
