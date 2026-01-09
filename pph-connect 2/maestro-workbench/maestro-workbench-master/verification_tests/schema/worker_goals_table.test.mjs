import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoCandidates = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master'),
  process.cwd(),
];

const repoRoot =
  repoCandidates.find((candidate) => existsSync(path.join(candidate, 'supabase', 'migrations'))) ?? repoCandidates.at(-1);

const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const combinedSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

const expectColumn = (column) => {
  const pattern = new RegExp(`CREATE\\s+TABLE[\\s\\S]+worker_goals[\\s\\S]+${column}`, 'i');
  assert.match(combinedSql, pattern, `Expected worker_goals to define column containing "${column}"`);
};

test('worker_goals table defines enums and core columns', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_goal_type\s+AS\s+ENUM\s*\(\s*'tasks'\s*,\s*'quality'\s*,\s*'earnings'\s*\)/i,
    'Expected worker_goal_type enum with tasks, quality, earnings'
  );
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_goal_period\s+AS\s+ENUM\s*\(\s*'weekly'\s*,\s*'monthly'\s*\)/i,
    'Expected worker_goal_period enum with weekly/monthly'
  );
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_goal_status\s+AS\s+ENUM\s*\(\s*'active'\s*,\s*'completed'\s*,\s*'expired'\s*\)/i,
    'Expected worker_goal_status enum'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.worker_goals/i,
    'Expected worker_goals table definition'
  );

  [
    'worker_id uuid',
    'goal_type',
    'period',
    'target_value',
    'description',
    'start_date',
    'end_date',
    'status',
    'progress_value',
    'progress_percent',
    'celebrated_at',
    'created_at',
    'updated_at'
  ].forEach(expectColumn);

  assert.match(
    combinedSql,
    /worker_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.workers\(/i,
    'Expected worker_id to reference workers'
  );
});

test('worker_goals table enforces indexes and policies', () => {
  [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_goals_worker\s+ON\s+public\.worker_goals\s*\(\s*worker_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_worker_goals_status\s+ON\s+public\.worker_goals\s*\(\s*status\s*\)/i,
  ].forEach((pattern) => {
    assert.match(combinedSql, pattern, 'Expected worker_goals indexes for worker/status');
  });

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.worker_goals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on worker_goals'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*view[^"]*goals"[\s\S]+worker_id\s*=\s*auth\.uid\(\)/i,
    'Expected worker-specific select policy'
  );

  assert.match(
    combinedSql,
    /worker_has_role[\s\S]+ARRAY\['root','admin','manager'\]/i,
    'Expected manager/admin management policy'
  );
});
