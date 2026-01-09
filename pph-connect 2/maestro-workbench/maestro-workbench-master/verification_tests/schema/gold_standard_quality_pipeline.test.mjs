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

const expectDefinition = (pattern, message) => {
  assert.match(combinedSql, pattern, message);
};

test('gold standard accuracy functions are defined', () => {
  expectDefinition(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+"?public"?\."?calculate_gold_standard_accuracy"?\s*\(/i,
    'Expected calculate_gold_standard_accuracy function'
  );

  expectDefinition(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+"?public"?\."?update_worker_trust_rating"?\s*\(/i,
    'Expected update_worker_trust_rating function'
  );
});

test('answers trigger processes gold standard submissions', () => {
  expectDefinition(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+"?public"?\."?process_gold_standard_answer"?\s*\(/i,
    'Expected process_gold_standard_answer trigger function'
  );

  expectDefinition(
    /CREATE\s+TRIGGER\s+process_gold_standard_answer_trigger\s+AFTER\s+INSERT\s+ON\s+public\.answers[\s\S]+EXECUTE\s+FUNCTION\s+public\.process_gold_standard_answer/i,
    'Expected trigger wiring process_gold_standard_answer on answers'
  );
});
