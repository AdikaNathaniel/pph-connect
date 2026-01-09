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

const servicePath = resolvePath('src', 'services', 'onboardingWorkflowService.ts');
const content = readFileSync(servicePath, 'utf8');

test('onboardingWorkflowService exports step config and helpers', () => {
  [
    /export\s+const\s+WORKFLOW_STEPS/i,
    /export\s+type\s+OnboardingStep/i,
    /export\s+async\s+function\s+getOnboardingProgress/i,
    /export\s+async\s+function\s+completeOnboardingStep/i,
    /export\s+async\s+function\s+resetOnboardingStep/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} in onboarding workflow service`);
  });
});

test('onboardingWorkflowService persists state to worker_onboarding_progress and tracks completion analytics', () => {
  assert.match(content, /supabase[\s\S]+\.from\('worker_onboarding_progress'\)/i, 'Expected worker_onboarding_progress queries');
  assert.match(content, /completed_at/i, 'Expected completion timestamps');
  assert.match(content, /WORKFLOW_STEPS[\s\S]+orientation\s+quiz/i, 'Expected orientation quiz step');
  assert.match(content, /step_id/i, 'Expected step identifiers stored');
});
