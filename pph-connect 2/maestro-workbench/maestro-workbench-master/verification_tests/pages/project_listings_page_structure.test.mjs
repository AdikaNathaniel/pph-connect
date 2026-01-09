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
const pagePath = resolvePath('src', 'pages', 'manager', 'ProjectListingsPage.tsx');

test('ProjectListingsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected ProjectListingsPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ProjectListingsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+ProjectListingsPage\b/, 'Expected default export');
});

test('App mounts project listings route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/ProjectListingsPage"\)\)/,
    'Expected lazy import for ProjectListingsPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/m\/project-listings"[\s\S]+ProjectListingsPage[\s\S]+\/>/,
    'Expected /m/project-listings route'
  );
});

test('ProjectListingsPage renders filter toolbar and listings table', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="project-listings-header"',
    'data-testid="project-listings-filters"',
    'data-testid="project-listings-table"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /supabase[\s\S]*\.from\('project_listings'\)/, 'Expected project_listings query');
});
