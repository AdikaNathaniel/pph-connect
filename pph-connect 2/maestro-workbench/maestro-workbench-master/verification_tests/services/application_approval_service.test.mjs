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

test('applicationApprovalService exports approveApplication helper with worker creation and onboarding log', () => {
  assert.ok(existsSync(servicePath), 'Expected applicationApprovalService to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+approveApplication/i, 'Expected approveApplication export');
  assert.match(
    content,
    /supabase[\s\S]*\.from\('workers'\)[\s\S]*insert/i,
    'Expected workers insert'
  );
  assert.match(
    content,
    /supabase[\s\S]*\.from\('applications'\)[\s\S]*update\([\s\S]*status:\s*'approved'/i,
    'Expected applications status update'
  );
  ['welcome_email_sent', 'credentials_provisioned', 'training_assigned'].forEach((eventType) => {
    assert.match(
      content,
      new RegExp(`event_type:\\s*['"]${eventType}['"]`, 'i'),
      `Expected onboarding event for ${eventType}`
    );
  });
});
