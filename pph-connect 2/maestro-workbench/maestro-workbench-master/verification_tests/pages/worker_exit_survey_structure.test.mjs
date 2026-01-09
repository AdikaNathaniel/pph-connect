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
const pagePath = resolvePath('src', 'pages', 'worker', 'ExitSurveyPage.tsx');

test('App registers /worker/exit-survey route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerExitSurveyPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/ExitSurveyPage"\)\)/,
    'Expected lazy import for WorkerExitSurveyPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/exit-survey"[\s\S]+?<ProtectedRoute\s+requiredRole="worker">[\s\S]+?<WorkerExitSurveyPage\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected /worker/exit-survey route guarded for workers'
  );
});

test('WorkerExitSurveyPage renders questionnaire fields and submit button', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-exit-survey"/, 'Expected root test id');
  assert.match(content, /submitExitSurvey/, 'Expected submit helper usage');
  assert.match(content, /reason-select/i, 'Expected reason select');
  assert.match(content, /overall-rating-slider/i, 'Expected rating input');
  assert.match(content, /improvement-textarea/i, 'Expected improvements field');
  assert.match(content, /would-recommend-toggle/i, 'Expected recommendation toggle');
  assert.match(content, /additional-feedback/i, 'Expected optional feedback input');
  assert.match(content, /data-testid="exit-survey-submit"/, 'Expected submit button');
  [
    /Reason for leaving/,
    /Overall experience \(1-5\)/,
    /What we could improve/,
    /Would you recommend to others\?/,
    /Optional feedback/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected question prompt matching ${pattern}`);
  });
});
