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

const servicePath = resolvePath('src', 'services', 'rehireEligibilityService.ts');
const content = readFileSync(servicePath, 'utf8');

test('rehireEligibilityService exports helpers to fetch and evaluate worker state', () => {
  [
    /export\s+async\s+function\s+fetchWorkerRehireRecord/i,
    /export\s+async\s+function\s+checkRehireEligibility/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} in service`);
  });
});

test('rehireEligibilityService queries workers table and uses evaluateRehireEligibility logic', () => {
  assert.match(content, /supabase[\s\S]+\.from\('workers'\)[\s\S]+select\(/i, 'Expected workers select');
  assert.match(content, /rehire_eligible/i, 'Expected rehire_eligible field usage');
  assert.match(content, /termination_reason/i, 'Expected termination_reason field usage');
  assert.match(content, /termination_date/i, 'Expected termination_date field usage');
  assert.match(content, /evaluateRehireEligibility/i, 'Expected logic import usage');
  assert.match(content, /update\({[\s\S]+rehire_eligible/i, 'Expected rehire updates when status changes');
});
