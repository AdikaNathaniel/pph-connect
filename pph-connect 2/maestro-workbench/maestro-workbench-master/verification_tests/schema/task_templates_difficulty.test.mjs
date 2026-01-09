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

test('task_templates define difficulty enum and column', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.task_difficulty_level\s+AS\s+ENUM\s*\(\s*'beginner'\s*,\s*'intermediate'\s*,\s*'advanced'\s*,\s*'expert'\s*\)/i,
    'Expected task_difficulty_level enum definition'
  );
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.task_templates[\s\S]+ADD\s+COLUMN[\s\S]+difficulty_level\s+public\.task_difficulty_level/i,
    'Expected difficulty_level column on task_templates'
  );
});
