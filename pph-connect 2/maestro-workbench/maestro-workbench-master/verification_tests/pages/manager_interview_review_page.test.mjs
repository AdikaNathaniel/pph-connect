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
const pagePath = resolvePath('src', 'pages', 'manager', 'InterviewReviewPage.tsx');

test('InterviewReviewPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected InterviewReviewPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+InterviewReviewPage/i, 'Expected named export');
  assert.match(content, /export\s+default\s+InterviewReviewPage/i, 'Expected default export');
});

test('App registers manager interview review route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/InterviewReviewPage"\)\)/,
    'Expected lazy import for InterviewReviewPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/manager\/interviews\/:id"[\s\S]+InterviewReviewPage[\s\S]+\/>/,
    'Expected manager interview review route'
  );
});

test('InterviewReviewPage fetches ai_interviews row and renders transcript controls', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /supabase[\s\S]*\.from\('ai_interviews'\)[\s\S]*select/, 'Expected ai_interviews query');
  assert.match(content, /data-testid="interview-review-transcript"/, 'Expected transcript section');
  assert.match(content, /Approve/i, 'Expected approve action');
  assert.match(content, /Reject/i, 'Expected reject action');
});
