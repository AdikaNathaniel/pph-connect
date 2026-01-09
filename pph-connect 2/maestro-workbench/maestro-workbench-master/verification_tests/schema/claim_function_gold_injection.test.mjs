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

test('claim_next_available_question considers gold standards', () => {
  const matches = [...combinedSql.matchAll(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+"?public"?\."?claim_next_available_question"?[\s\S]+?END;\s*\$\$/gi
  )];
  assert.ok(matches.length > 0, 'Expected claim_next_available_question definition');
  const body = matches[matches.length - 1][0];

  assert.match(
    body,
    /is_gold_standard\s*=\s*TRUE/i,
    'Expected claim function to filter by gold standard flag'
  );

  assert.match(
    body,
    /ORDER\s+BY\s+random\(\)/i,
    'Expected gold standard selection to use random ordering'
  );

  assert.match(body, /IF\s+v_select_gold\s+THEN/i, 'Expected conditional branch to toggle gold selection');
});
