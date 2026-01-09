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
const pagePath = resolvePath('src', 'pages', 'manager', 'AssessmentsPage.tsx');

test('AssessmentsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected AssessmentsPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+AssessmentsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+AssessmentsPage\b/, 'Expected default export');
});

test('App mounts AssessmentsPage for /m/assessments', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/AssessmentsPage"\)\)/,
    'Expected AssessmentsPage lazy import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/assessments"\s+element=\{\s*<ProtectedRoute[\s\S]*?<ManagerLayout[\s\S]*?<AssessmentsPage\s*\/>[\s\S]*?\}\s*\/>/,
    'Expected /m/assessments route to mount AssessmentsPage inside ManagerLayout'
  );
});

test('AssessmentsPage renders sections for list/create/assign/results', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="assessments-page-list"',
    'data-testid="assessments-page-create"',
    'data-testid="assessments-page-assign"',
    'data-testid="assessments-page-results"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /useState\(false\)/, 'Expected modal or drawer state');
  assert.match(content, /const\s+loadAssessments\s*=\s*useCallback/, 'Expected fetch callback');
});

test('AssessmentsPage includes manual grading queue with short answer/task prompts', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /const\s+manualGradingQueue\s*=\s*\[/, 'Expected manual grading seed data');
  assert.match(content, /short_answer/, 'Expected short answer item');
  assert.match(content, /task/, 'Expected task-based item');
  assert.match(content, /data-testid="assessments-page-review"/, 'Expected review queue section');
  assert.match(content, /Grading queue/, 'Expected section title');
});

test('AssessmentsPage provides grading modal with rubric, score, and feedback inputs', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /const\s+\[activeReview,\s*setActiveReview\]/, 'Expected state for active review');
  assert.match(content, /setReviewDialogOpen/, 'Expected dialog state setter');
  assert.match(content, /data-testid="manual-grading-modal"/, 'Expected modal test id');
  assert.match(content, /aria-label="Rubric"/, 'Expected rubric display');
  assert.match(content, /manual-score-input/, 'Expected score input control id');
  assert.match(content, /manual-feedback-input/, 'Expected feedback textarea id');
  assert.match(content, /onClick=\{\(\)\s*=>\s*openReview\(/, 'Expected review handler');
});

test('AssessmentsPage submits manual grades via assessmentService with toast feedback', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /import\s+\{\s*submitManualGrade\s*\}\s+from\s+'@\/services\/assessmentService';/,
    'Expected submitManualGrade import'
  );
  assert.match(content, /import\s+\{\s*toast\s*\}\s+from\s+'sonner';/, 'Expected toast import');
  assert.match(content, /await\s+submitManualGrade/, 'Expected manual grade submission');
  assert.match(content, /toast\.(success|error)/, 'Expected toast usage');
});
