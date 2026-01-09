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

test('ai_interviews table exists with required columns', () => {
  [
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.ai_interviews/i,
    /worker_id\s+uuid\s+NOT\s+NULL/i,
    /domain\s+text\s+NOT\s+NULL/i,
    /questions_asked\s+jsonb\s+NOT\s+NULL/i,
    /answers_given\s+jsonb\s+NOT\s+NULL/i,
    /transcript\s+text\s+NOT\s+NULL/i,
    /score\s+numeric(?:\(\d+,\d+\))?\s+NOT\s+NULL/i,
    /confidence\s+numeric(?:\(\d+,\d+\))?\s+NOT\s+NULL/i,
    /conducted_at\s+timestamptz\s+NOT\s+NULL/i,
  ].forEach((pattern) => {
    assert.match(combinedSql, pattern, `Expected migrations to define ${pattern}`);
  });
});

test('ai_interviews table defines indexes and foreign keys', () => {
  assert.match(
    combinedSql,
    /(worker_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.workers|FOREIGN\s+KEY\s*\(worker_id\)\s+REFERENCES\s+public\.workers)/i,
    'Expected worker_id FK'
  );
  assert.match(
    combinedSql,
    /(skill_verification_id\s+uuid\s+REFERENCES\s+public\.skill_verifications|FOREIGN\s+KEY\s*\(skill_verification_id\))/i,
    'Expected optional link to skill_verifications'
  );
});
