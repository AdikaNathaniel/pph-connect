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
test('workers table includes offboarding columns', () => {
  assert.match(combinedSql, /ALTER\s+TABLE\s+public\.workers[\s\S]+termination_reason/i, 'Expected termination_reason column');
  assert.match(combinedSql, /ALTER\s+TABLE\s+public\.workers[\s\S]+rehire_eligible\s+boolean/i, 'Expected rehire_eligible boolean column');
});
