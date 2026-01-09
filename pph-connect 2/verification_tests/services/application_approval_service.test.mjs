import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const servicePath = resolvePath('src', 'services', 'applicationApprovalService.ts');

test('applicationApprovalService exports approve helper that creates worker, onboarding, and updates application', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+approveApplication/, 'Expected approve export');
  assert.match(
    content,
    /supabase\.from\(['"]applications['"]\)\.update/i,
    'Expected application status update'
  );
  assert.match(content, /status:\s*'approved'/i, 'Expected approved status');
  assert.match(content, /supabase\.from\(['"]workers['"]\)\.insert/i, 'Expected worker insert');
  assert.match(content, /onboarding_actions/i, 'Expected onboarding workflow trigger or log');
});
