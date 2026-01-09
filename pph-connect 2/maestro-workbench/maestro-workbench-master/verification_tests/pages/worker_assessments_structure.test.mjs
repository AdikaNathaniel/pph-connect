import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'Assessments.tsx');

test('Worker Assessments page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected worker Assessments page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerAssessmentsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerAssessmentsPage\b/, 'Expected default export');
});

test('App mounts worker assessments route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Assessments"\)\)/,
    'Expected lazy import for worker assessments page'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/assessments"[\s\S]+WorkerAssessmentsPage[\s\S]+\/>/,
    'Expected /w/assessments route'
  );
});

test('Worker Assessments page renders navigation, active assessment view, and results summary', () => {
  const content = readFileSync(pagePath, 'utf8');
  ['data-testid="worker-assessments-list"', 'data-testid="worker-assessment-runner"', 'data-testid="worker-assessment-results"'].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /useState\(/, 'Expected local state for workflow');
  assert.match(content, /handleStart\s*=\s*\(/, 'Expected start logic');
});

test('Worker Assessments page hooks grading service, auth, and record helper', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /import\s+\{\s*gradeAssessmentResponses\s*\}\s+from\s+'@\/services\/assessmentGradingService';/, 'Expected grading helper import');
  assert.match(content, /import\s+\{[^}]*recordAssessmentResult[^}]*\}\s+from\s+'@\/services\/assessmentService';/, 'Expected record helper import');
  assert.match(content, /import\s+\{\s*useAuth\s*\}\s+from\s+'@\/contexts\/AuthContext';/, 'Expected useAuth import');
  assert.match(content, /toast\./, 'Expected toast notifications for results');
  assert.match(content, /gradeAssessmentResponses\(/, 'Expected gradeAssessmentResponses usage');
  assert.match(content, /recordAssessmentResult\(/, 'Expected recordAssessmentResult usage');
});
