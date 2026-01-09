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

test('training_modules table includes domain_tags array column', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.training_modules[\s\S]+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+domain_tags\s+text\[\]/i,
    'Expected migration adding domain_tags text[] column'
  );
  assert.match(combinedSql, /domain_tags\s+text\[\][\s\S]+DEFAULT\s+'{}'::text\[\]/i, 'Expected domain_tags default empty array');
});
