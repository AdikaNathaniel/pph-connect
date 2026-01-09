import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const appPath = resolvePath(['src', 'App.tsx']);
const pagePath = resolvePath(['src', 'pages', 'manager', 'TeamsPage.tsx']);

test('TeamsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected TeamsPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /export\s+type\s+TeamRow\b/, 'Expected TeamRow type export');
  assert.match(content, /export\s+const\s+TeamsPage\b/, 'Expected named TeamsPage export');
  assert.match(content, /export\s+default\s+TeamsPage\b/, 'Expected default TeamsPage export');
});

test('App mounts TeamsPage for /m/teams', () => {
  const content = readFileSync(appPath, 'utf8');

  assert.match(
    content,
    /import\s+TeamsPage\s+from\s+"\.\/pages\/manager\/TeamsPage";/,
    'Expected TeamsPage import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/teams"\s+element=\{\s*<ProtectedRoute[^>]*>\s*<ManagerLayout[^>]*pageTitle="Teams"[^>]*breadcrumbs=\{\s*\[\s*\{\s*label:\s*"Teams"\s*,\s*current:\s*true\s*\}\s*\]\s*\}[^>]*>\s*<TeamsPage\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/teams route to render TeamsPage within ManagerLayout'
  );
});

test('TeamsPage renders header, search, filters, and actions', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="teams-page-title"/, 'Expected title test id');
  assert.match(content, /data-testid="teams-page-actions"/, 'Expected actions container test id');
  assert.match(content, /onClick=\{\(\)\s*=>\s*setAddModalOpen\(true\)\}/, 'Expected Add Team button to open modal');
  assert.match(content, /data-testid="teams-page-search"/, 'Expected search input');
  assert.match(content, /data-testid="teams-page-filters"/, 'Expected filters container');
  assert.match(
    content,
    /const\s+\[departmentFilter,\s*setDepartmentFilter\]\s*=\s*useState/,
    'Expected department filter state'
  );
  assert.match(
    content,
    /const\s+\[activeFilter,\s*setActiveFilter\]\s*=\s*useState/,
    'Expected active filter state'
  );
  assert.match(
    content,
    /data-testid="teams-filter-department"/,
    'Expected department Select test id'
  );
  assert.match(
    content,
    /data-testid="teams-filter-active"/,
    'Expected active Select test id'
  );
});

test('TeamsPage defines table columns and filtered dataset', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="teams-table"/, 'Expected teams table wrapper');
  assert.match(content, /TableHead[^>]*>Team Name</, 'Expected Team Name column header');
  assert.match(content, /TableHead[^>]*>Department</, 'Expected Department column header');
  assert.match(content, /TableHead[^>]*>Primary Locale</, 'Expected Primary Locale column header');
  assert.match(content, /TableHead[^>]*>Secondary Locale</, 'Expected Secondary Locale column header');
  assert.match(content, /TableHead[^>]*>Region</, 'Expected Region column header');
  assert.match(content, /TableHead[^>]*>Active Status/, 'Expected Active Status column header');
  assert.match(content, /TableHead[^>]*>Actions</, 'Expected Actions column header');
  assert.match(
    content,
    /const\s+filteredTeams\s*=\s*useMemo/,
    'Expected memoized filtered dataset'
  );
  assert.match(
    content,
    /Switch[\s\S]*data-testid="teams-table-active-toggle"/,
    'Expected active status toggle switch'
  );
  assert.match(
    content,
    /DropdownMenuItem/,
    'Expected action dropdown items'
  );
});
