import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'supabase', 'migrations'),
    path.join(process.cwd(), 'supabase', 'migrations')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Unable to locate supabase/migrations');
  }
  return match;
})();

const MIGRATION_PATTERNS = [
  /create\s+index\s+if\s+not\s+exists\s+projects_training_module_id_idx\s+on\s+(public\.)?projects\s*\(\s*training_module_id\s*\)/i,
  /create\s+index\s+if\s+not\s+exists\s+worker_training_completions_module_completed_idx\s+on\s+(public\.)?worker_training_completions\s*\(\s*training_module_id\s*,\s*completed_at\s*\)/i
];

test('training module related indexes exist in migrations', () => {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const contents = files.map((file) =>
    readFileSync(path.join(migrationsDir, file), 'utf8')
  );

  MIGRATION_PATTERNS.forEach((pattern) => {
    const found = contents.some((content) => pattern.test(content));
    assert.ok(found, `Expected to find index statement matching ${pattern}`);
  });
});
