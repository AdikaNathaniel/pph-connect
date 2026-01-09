import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const servicePath = resolvePath('src', 'services', 'customModalityService.ts');
const content = readFileSync(servicePath, 'utf8');

test('customModalityService exports CRUD helpers', () => {
  [
    /export\s+async\s+function\s+listCustomModalities/i,
    /export\s+async\s+function\s+createCustomModality/i,
    /export\s+async\s+function\s+updateCustomModality/i,
    /export\s+async\s+function\s+deleteCustomModality/i,
  ].forEach((pattern) => assert.match(content, pattern, `Expected ${pattern}`));
});

test('customModalityService uses supabase custom_modalities table', () => {
  assert.match(
    content,
    /supabase[\s\S]+\.from\('custom_modalities'\)/i,
    'Expected custom_modalities table usage'
  );
  assert.match(content, /modality_config/i, 'Expected modality_config payload handling');
  assert.match(content, /column_config/i, 'Expected column_config payload handling');
});
