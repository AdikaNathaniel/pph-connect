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

test('applicationApprovalService exports rejectWorkerApplication helper', () => {
  assert.ok(existsSync(servicePath), 'Expected applicationApprovalService to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+rejectWorkerApplication/i, 'Expected rejectWorkerApplication export');
  assert.match(
    content,
    /supabase[\s\S]*\.from\('worker_applications'\)[\s\S]*update\([\s\S]*status:\s*'rejected'/i,
    'Expected application status to update to rejected'
  );
  assert.match(
    content,
    /notes|rejectionReason/i,
    'Expected rejection reason handling'
  );
  assert.match(
    content,
    /supabase\.functions\.invoke\('send-message'/,
    'Expected rejection notification message'
  );
});
