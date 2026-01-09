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
const pagePath = resolvePath('src', 'pages', 'worker', 'Training.tsx');

test('WorkerTraining page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerTraining page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerTrainingPage\b/, 'Expected named WorkerTrainingPage export');
  assert.match(content, /export\s+default\s+WorkerTrainingPage\b/, 'Expected default WorkerTrainingPage export');
});

test('App mounts worker training routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Training"\)\)/,
    'Expected lazy import for WorkerTraining page'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/training"[\s\S]+WorkerTrainingPage[\s\S]+\/>/,
    'Expected /w/training route'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/training"[\s\S]+WorkerTrainingPage[\s\S]+\/>/,
    'Expected /worker/training route alias'
  );
});

test('WorkerTraining page renders materials, gates, and CTA sections', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-training-header"',
    'data-testid="worker-training-list"',
    'data-testid="worker-training-empty"',
    'data-testid="worker-training-gates"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /handleRefreshTraining/, 'Expected refresh handler');
  assert.match(content, /useEffect\(/, 'Expected effect to load training data');
});

test('WorkerTraining page queries training materials, access, gates, and links to assessments', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /supabase[\s\S]*\.from\('worker_training_access'\)/, 'Expected worker_training_access query');
  assert.match(content, /training_material:training_materials/, 'Expected training_materials join');
  assert.match(content, /supabase[\s\S]*\.from\('training_gates'\)/, 'Expected training_gates query');
  assert.match(content, /navigate\('\/w\/assessments'\)/, 'Expected CTA to worker assessments');
});
