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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'AvailableProjectsPage.tsx');

test('AvailableProjectsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected AvailableProjectsPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+AvailableProjectsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+AvailableProjectsPage\b/, 'Expected default export');
});

test('App mounts worker available projects route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/AvailableProjectsPage"\)\)/,
    'Expected lazy import for AvailableProjectsPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/worker\/projects\/available"[\s\S]+AvailableProjectsPage[\s\S]+\/>/,
    'Expected worker route'
  );
});

test('AvailableProjectsPage renders filters and project cards', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="available-projects-header"',
    'data-testid="available-projects-filters"',
    'data-testid="available-projects-list"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /supabase[\s\S]*\.from\('project_listings'\)/, 'Expected project_listings query');
  assert.match(
    content,
    /projects:projects\([^)]*requires_training_gate/i,
    'Expected listing query to include requires_training_gate flag'
  );
  assert.match(content, /supabase[\s\S]*\.from\('training_gates'\)/, 'Expected training gates query');
  assert.match(content, /trainingStatusByProject|trainingGateEligible|trainingPassed/, 'Expected training gate calculation');
  assert.match(content, /supabase[\s\S]*\.from\('performance_thresholds'\)/, 'Expected quality threshold query');
  assert.match(content, /supabase[\s\S]*\.from\('quality_metrics'\)/, 'Expected worker quality metrics query');
  assert.match(content, /qualityThresholds|qualityStatus|qualityEligible|qualityGate/, 'Expected quality gate calculation');
  assert.match(content, /const\s+isEligible/, 'Expected eligibility calculation');
  assert.match(content, /Not Eligible/, 'Expected not-eligible messaging');
});
