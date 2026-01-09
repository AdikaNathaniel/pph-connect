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

const servicePath = resolvePath('src', 'services', 'appealsService.ts');

test('appealsService exports worker and manager helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected appealsService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+interface\s+AppealRecord/i,
    /export\s+type\s+AppealDecision/i,
    /export\s+async\s+function\s+fetchAppealableRemovals/i,
    /export\s+async\s+function\s+submitAppeal/i,
    /export\s+async\s+function\s+fetchAppealsForReview/i,
    /export\s+async\s+function\s+reviewAppealDecision/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} in appeals service`);
  });
});

test('appealsService interacts with auto_removals and messaging', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /supabase[\s\S]+\.from\('auto_removals'\)/i, 'Expected auto_removals queries');
  assert.match(content, /appeal_message/i, 'Expected appeal message persistence');
  assert.match(content, /appeal_submitted_at/i, 'Expected submission timestamp handling');
  assert.match(content, /appeal_reviewed_by/i, 'Expected reviewer metadata updates');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/i, 'Expected notification on appeal events');
});
