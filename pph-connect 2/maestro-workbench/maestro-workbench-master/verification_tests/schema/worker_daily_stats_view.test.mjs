import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function readAllMigrations() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readAllMigrations();

test('worker_daily_stats view aggregates work_stats by date and worker', () => {
  assert.match(
    combinedSql,
    /CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.worker_daily_stats/i,
    'Expected worker_daily_stats view to be defined'
  );

  assert.match(
    combinedSql,
    /SELECT\s+worker_id[\s\S]+sum\(\s*units_completed\s*\)\s+AS\s+units/i,
    'Expected worker_daily_stats view to sum units'
  );

  assert.match(
    combinedSql,
    /GROUP\s+BY\s+worker_id\s*,\s*work_date/i,
    'Expected worker_daily_stats view to group by worker_id and work_date'
  );
});
