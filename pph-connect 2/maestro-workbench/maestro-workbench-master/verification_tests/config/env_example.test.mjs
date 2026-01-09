import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function resolvePath(relativePath) {
  const candidates = [
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Could not locate ${relativePath}`);
  }
  return match;
}

const envExample = resolvePath('.env.example');

test('.env.example includes Supabase auth variables', () => {
  const content = readFileSync(envExample, 'utf8');

  [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'SUPABASE_REDIRECT_URL_APP',
    'SUPABASE_REDIRECT_URL_DASHBOARD'
  ].forEach((key) => {
    assert.match(content, new RegExp(`${key}=`, 'i'), `Expected ${key} in .env.example`);
  });
});
