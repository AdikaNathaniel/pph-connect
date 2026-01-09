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
const pagePath = resolvePath('src', 'pages', 'manager', 'ProjectApplicationsPage.tsx');

test('ProjectApplicationsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected ProjectApplicationsPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ProjectApplicationsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+ProjectApplicationsPage\b/, 'Expected default export');
});

test('App mounts project applications manager route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/ProjectApplicationsPage"\)\)/,
    'Expected lazy import for ProjectApplicationsPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/m\/projects\/:id\/applications"[\s\S]+ProjectApplicationsPage[\s\S]+\/>/,
    'Expected manager applications route'
  );
});

test('ProjectApplicationsPage queries worker applications with worker metadata and renders actions', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="project-applications-header"',
    'data-testid="project-applications-list"',
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(
    content,
    /supabase[\s\S]*\.from\('worker_applications'\)/,
    'Expected worker_applications query'
  );
  assert.match(
    content,
    /select\([\s\S]*workers:workers\([\s\S]*hr_id[\s\S]*quality/i,
    'Expected join to workers with HR ID and quality data'
  );
  assert.match(content, /project_listings(?::|!inner)/, 'Expected project listing join');
  assert.match(content, /notes/, 'Expected cover message/notes rendering');
  assert.match(content, /Approve/, 'Expected approve action');
  assert.match(content, /Reject/, 'Expected reject action');
  assert.match(content, /rejectWorkerApplication/, 'Expected rejection helper usage');
});
