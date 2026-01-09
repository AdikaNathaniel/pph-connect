import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const componentPath = resolvePath('src', 'components', 'assessments', 'AssessmentCreator.tsx');
const pagePath = resolvePath('src', 'pages', 'manager', 'AssessmentsPage.tsx');

test('AssessmentCreator component exists with expected sections', () => {
  const content = readFileSync(componentPath, 'utf8');
  assert.match(content, /export\s+const\s+AssessmentCreator\b/, 'Expected AssessmentCreator export');
  ['assessment-creator-metadata', 'assessment-creator-questions', 'assessment-creator-preview'].forEach((testId) => {
    assert.match(content, new RegExp(`data-testid="${testId}"`), `Expected ${testId}`);
  });
  assert.match(content, /Add question/i, 'Expected question builder logic');
  assert.match(content, /True\/False/i, 'Expected true\/false toggle');
  assert.match(content, /Task-based/i, 'Expected task-based toggle');
});

test('AssessmentsPage renders AssessmentCreator', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /import\s+AssessmentCreator\s+from\s+'@\/components\/assessments\/AssessmentCreator';/,
    'Expected AssessmentCreator import on page'
  );
  assert.match(
    content,
    /<AssessmentCreator\s+.*?\/>/s,
    'Expected AssessmentCreator rendered in page'
  );
});
