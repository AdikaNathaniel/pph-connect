import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const scriptPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'supabase', 'test', 'setup_integration_env.sh'),
    path.join(process.cwd(), 'supabase', 'test', 'setup_integration_env.sh'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    return candidates[0];
  }
  return match;
})();

test('integration setup script exists and references Supabase CLI workflow', () => {
  assert.ok(existsSync(scriptPath), 'Expected setup_integration_env.sh to exist under supabase/test');
  const content = readFileSync(scriptPath, 'utf8');
  assert.match(content, /supabase start/i, 'Expected script to mention supabase start');
  assert.match(content, /supabase db reset/i, 'Expected script to reset the database');
  assert.match(content, /supabase migration up|supabase db push/i, 'Expected script to run migrations');
});

test('integration seed SQL provides baseline worker/project fixtures', () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'supabase', 'test', 'seed_integration_data.sql'),
    path.join(process.cwd(), 'supabase', 'test', 'seed_integration_data.sql'),
  ];
  const seedPath = candidates.find((candidate) => existsSync(candidate));
  assert.ok(seedPath, 'Expected seed_integration_data.sql to exist');
  const content = readFileSync(seedPath, 'utf8');
  assert.match(content, /insert\s+into\s+workers/i, 'Expected workers fixture inserts');
  assert.match(content, /insert\s+into\s+projects/i, 'Expected projects fixture inserts');
  assert.match(content, /insert\s+into\s+work_stats/i, 'Expected work_stats fixture inserts');
});

test('integration env template lists required Supabase credentials', () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', '.env.integration.example'),
    path.join(process.cwd(), '.env.integration.example'),
  ];
  const envPath = candidates.find((candidate) => existsSync(candidate));
  assert.ok(envPath, 'Expected .env.integration.example to exist');
  const content = readFileSync(envPath, 'utf8');
  ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL'].forEach((key) => {
    assert.match(content, new RegExp(`${key}=`, 'i'), `Expected ${key} entry`);
  });
});
