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
const pagePath = resolvePath('src', 'pages', 'worker', 'Assignments.tsx');

test('WorkerAssignments page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerAssignments page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerAssignmentsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerAssignmentsPage\b/, 'Expected default export');
});

test('App mounts worker assignments routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Assignments"\)\)/,
    'Expected lazy import for WorkerAssignments page'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/assignments"[\s\S]+WorkerAssignmentsPage[\s\S]+\/>/,
    'Expected /w/assignments route'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/assignments"[\s\S]+WorkerAssignmentsPage[\s\S]+\/>/,
    'Expected /worker/assignments route alias'
  );
});

test('WorkerAssignments page renders list, empty state, and metadata blocks', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-assignments-list"',
    'data-testid="worker-assignments-empty"',
    'data-testid="worker-assignments-header"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /handleRefreshAssignments/, 'Expected refresh handler');
  assert.match(content, /useEffect\(/, 'Expected effect to load assignments');
});

test('WorkerAssignments page queries project_assignments and projects', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /supabase[\s\S]*\.from\('project_assignments'\)/, 'Expected project_assignments query');
  assert.match(content, /\.select\([\s\S]*projects\s*\(/, 'Expected select pulling project details');
  assert.match(content, /navigate\(\'\/w\/workbench\'\)/, 'Expected CTA to Maestro workbench');
});
