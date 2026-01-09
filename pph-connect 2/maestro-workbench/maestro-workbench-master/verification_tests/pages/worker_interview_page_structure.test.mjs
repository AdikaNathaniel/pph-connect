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
const pagePath = resolvePath('src', 'pages', 'worker', 'InterviewPage.tsx');

test('InterviewPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected InterviewPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+InterviewPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+InterviewPage\b/, 'Expected default export');
});

test('App mounts worker interview route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/InterviewPage"\)\)/,
    'Expected lazy import for InterviewPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/worker\/interview\/:domain"[\s\S]+InterviewPage[\s\S]+\/>/,
    'Expected worker interview route'
  );
});

test('InterviewPage renders chat interface and uses aiInterviewService', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-interview-header"',
    'data-testid="worker-interview-chat"',
    'data-testid="worker-interview-composer"',
    'data-testid="worker-interview-progress"',
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /startInterview\(/, 'Expected startInterview usage');
  assert.match(content, /askQuestion\(/, 'Expected askQuestion usage');
  assert.match(content, /evaluateAnswer\(/, 'Expected evaluateAnswer usage');
  assert.match(content, /generateInterviewReport\(/, 'Expected generateInterviewReport usage');
  assert.match(content, /saveInterviewResult\(/, 'Expected persistence helper usage');
  assert.match(content, /useParams\(/, 'Expected domain param handling');
});
