import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const statsPagePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'StatsPage.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'StatsPage.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate StatsPage.tsx');
  }
  return match;
})();

const content = readFileSync(statsPagePath, 'utf8');

test('StatsPage exports component and default', () => {
  assert.match(content, /export\s+const\s+StatsPage/, 'Expected named StatsPage export');
  assert.match(content, /export\s+default\s+StatsPage/, 'Expected default StatsPage export');
});

test('StatsPage renders header and actions', () => {
  assert.match(content, /data-testid="stats-page"/, 'Expected root test id');
  assert.match(content, /<h1[^>]*>Stats<\/h1>/, 'Expected Stats heading');
  assert.match(content, /Import Stats/, 'Expected Import Stats button');
  assert.match(content, /data-testid="stats-import-button"/, 'Expected import button test id');
});

test('StatsPage provides filter controls', () => {
  assert.match(content, /data-testid="stats-filter-form"/, 'Expected filter form container');
  assert.match(content, /name="dateStart"/, 'Expected start date input');
  assert.match(content, /name="dateEnd"/, 'Expected end date input');
  assert.match(content, /data-testid="stats-project-filter"/, 'Expected project filter select');
  assert.match(content, /data-testid="stats-worker-filter"/, 'Expected worker filter select');
});

test('StatsPage includes stats history table shell', () => {
  assert.match(content, /data-testid="stats-history-table"/, 'Expected stats history table placeholder');
  assert.match(content, /TableHeader/, 'Expected table header definition');
  assert.match(content, /TableBody/, 'Expected table body placeholder');
});
