import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

const logicPath = resolvePath('src', 'lib', 'rehireEligibility.ts');

const content = readFileSync(logicPath, 'utf8');

test('rehireEligibility logic exports helpers for evaluating worker eligibility', () => {
  [
    /export\s+interface\s+RehireEligibilityInput/i,
    /export\s+interface\s+RehireEligibilityResult/i,
    /export\s+function\s+evaluateRehireEligibility/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected pattern ${pattern} in logic file`);
  });
});

test('rehireEligibility logic enforces policy and performance rules with cooldown window', () => {
  assert.match(content, /const\s+PERFORMANCE_COOLDOWN_MONTHS\s*=\s*6/i, 'Expected 6 month cooldown constant');
  assert.match(content, /policy_violation/i, 'Expected policy violation handling');
  assert.match(content, /performance_issue/i, 'Expected performance handling');
  assert.match(content, /terminationDate/i, 'Expected termination date usage');
  assert.match(content, /eligibleAfter/i, 'Expected eligibleAfter calculations');
});
