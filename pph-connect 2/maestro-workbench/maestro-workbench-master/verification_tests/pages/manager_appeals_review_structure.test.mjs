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
const pagePath = resolvePath('src', 'pages', 'manager', 'AppealsReviewPage.tsx');

test('App registers manager appeals review route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+ManagerAppealsReviewPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/AppealsReviewPage"\)\)/,
    'Expected lazy import for manager appeals review page'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/appeals"[\s\S]+?<ProtectedRoute\s+requiredRole="manager">[\s\S]+?<ManagerLayout[\s\S]+?<ManagerAppealsReviewPage\s*\/>[\s\S]+?<\/ManagerLayout>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected /m/appeals route rendered inside ManagerLayout'
  );
});

test('ManagerAppealsReviewPage renders pending appeals table', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="manager-appeals-page"/, 'Expected root test id for manager appeals page');
  assert.match(content, /fetchAppealsForReview/, 'Expected fetch helper usage');
  assert.match(content, /reviewAppealDecision/, 'Expected review mutation helper');
  assert.match(content, /data-testid="appeal-review-card"/, 'Expected card per appeal');
  assert.match(content, /data-testid="appeal-decision-notes"/, 'Expected notes textarea');
  assert.match(content, /data-testid="appeal-approve-button"/, 'Expected approve button');
  assert.match(content, /data-testid="appeal-deny-button"/, 'Expected deny button');
});
