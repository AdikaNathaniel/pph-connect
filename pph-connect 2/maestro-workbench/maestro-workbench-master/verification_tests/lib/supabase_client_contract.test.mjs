import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const clientPath = path.join(
  process.cwd(),
  'maestro-workbench',
  'maestro-workbench-master',
  'src',
  'integrations',
  'supabase',
  'client.ts'
);

test('Supabase client imports createClient and exports supabase instance', () => {
  const content = readFileSync(clientPath, 'utf8');
  assert.match(content, /import\s+\{\s*createClient\s*\}\s+from\s+'@supabase\/supabase-js';/, 'Expected createClient import');
  assert.match(content, /export\s+const\s+supabase\s*=\s*createClient<Database>\(/, 'Expected supabase export using createClient');
});

test('Supabase client reads environment variables and guards against missing values', () => {
  const content = readFileSync(clientPath, 'utf8');
  assert.match(content, /import\.meta\.env\.VITE_SUPABASE_URL/, 'Expected reference to VITE_SUPABASE_URL');
  assert.match(content, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/, 'Expected reference to VITE_SUPABASE_ANON_KEY');
  assert.match(
    content,
    /throw\s+new\s+Error\([\s\S]*VITE_SUPABASE_URL\s+and\s+VITE_SUPABASE_ANON_KEY[\s\S]*\);/,
    'Expected descriptive error when env vars are missing'
  );
});
