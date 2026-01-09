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

const servicePath = resolvePath('src', 'services', 'offboardingService.ts');
const content = readFileSync(servicePath, 'utf8');

test('offboardingService exports trigger and workflow helpers', () => {
  [
    /export\s+const\s+OFFBOARDING_TRIGGERS/i,
    /export\s+async\s+function\s+triggerOffboarding/i,
    /export\s+async\s+function\s+processOffboardingStep/i,
    /export\s+async\s+function\s+fetchOffboardingStatus/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} definition`);
  });
  assert.match(content, /createInvoice/i, 'Expected invoice creation helper import');
});

test('offboardingService updates worker status, logs events, and handles rehire eligibility', () => {
  assert.match(content, /termination_reason/i, 'Expected worker updates with termination reason');
  assert.match(content, /supabase[\s\S]+\.from\('offboarding_events'\)/i, 'Expected offboarding events log');
  assert.match(content, /rehire_eligible/i, 'Expected rehire eligibility logic');
  assert.match(content, /checkRehireEligibility|evaluateRehireEligibility/i, 'Expected helper usage for rehire rules');
  assert.match(content, /worker_training_assignments|worker_training_access/i, 'Expected cleanup of access or training');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/i, 'Expected notifications to worker or manager');
  assert.match(content, /worker_accounts/i, 'Expected revoke access helper to touch worker_accounts');
  assert.match(content, /invoices/i, 'Expected generate/process invoice operations');
  ['remove_assignments', 'revoke_access', 'generate_invoice', 'process_payment', 'exit_survey', 'archive_worker', 'update_rehire_status'].forEach(
    (step) => {
      assert.match(content, new RegExp(step, 'i'), `Expected ${step} handler`);
    },
  );
});
