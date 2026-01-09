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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'OnboardingPage.tsx');

test('App registers /worker/onboarding route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerOnboardingPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/OnboardingPage"\)\)/,
    'Expected lazy import for WorkerOnboardingPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/onboarding"[\s\S]+?<ProtectedRoute\s+requiredRole="worker">[\s\S]+?<WorkerOnboardingPage\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected /worker/onboarding route with worker guard'
  );
});

test('WorkerOnboardingPage renders progress list and training assignments', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-onboarding-page"/, 'Expected root test id');
  assert.match(content, /getOnboardingProgress/, 'Expected progress query helper');
  assert.match(content, /completeOnboardingStep/, 'Expected completion action');
  assert.match(content, /data-testid="onboarding-step-card"/, 'Expected step card element');
  assert.match(content, /data-testid="onboarding-complete-button"/, 'Expected complete button');
  assert.match(content, /data-testid="onboarding-reset-button"/, 'Expected reset action');
  assert.match(content, /fetchTrainingAssignments/, 'Expected training assignment query');
  assert.match(content, /assignTrainingForWorker/, 'Expected auto-assignment helper');
  assert.match(content, /data-testid="training-assignments-section"/, 'Expected assigned training section test id');
  assert.match(content, /data-testid="training-complete-button"/, 'Expected training completion action');
});
