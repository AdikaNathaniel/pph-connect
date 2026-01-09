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
const pagePath = resolvePath(['src', 'pages', 'manager', 'DepartmentsPage.tsx']);

test('DepartmentsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected DepartmentsPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /export\s+type\s+DepartmentRow\b/, 'Expected DepartmentRow type export');
  assert.match(content, /export\s+const\s+DepartmentsPage\b/, 'Expected named DepartmentsPage export');
  assert.match(content, /export\s+default\s+DepartmentsPage\b/, 'Expected default DepartmentsPage export');
});

test('App mounts DepartmentsPage for /m/departments', () => {
  const content = readFileSync(appPath, 'utf8');

  assert.match(
    content,
    /import\s+DepartmentsPage\s+from\s+"\.\/pages\/manager\/DepartmentsPage";/,
    'Expected DepartmentsPage import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/departments"\s+element=\{\s*<ProtectedRoute[^>]*>\s*<ManagerLayout[^>]*pageTitle="Departments"[^>]*breadcrumbs=\{\s*\[\s*\{\s*label:\s*"Departments",\s*current:\s*true\s*\}\s*\]\s*\}[^>]*>\s*<DepartmentsPage\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/departments route configuration'
  );
});

test('DepartmentsPage renders header and actions', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="departments-page-title"/, 'Expected title test id');
  assert.match(content, /data-testid="departments-page-actions"/, 'Expected actions container');
  assert.match(content, /onClick=\{\(\)\s*=>\s*setAddModalOpen\(true\)\}/, 'Expected Add Department button to open modal');
});

test('DepartmentsPage defines data table with expected columns and actions', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="departments-table"/, 'Expected departments table');
  assert.match(content, /TableHead[^>]*>Department Name</, 'Expected Department Name column header');
  assert.match(content, /TableHead[^>]*>Code</, 'Expected Code column header');
  assert.match(content, /TableHead[^>]*>Teams Count</, 'Expected Teams Count column header');
  assert.match(content, /TableHead[^>]*>Projects Count</, 'Expected Projects Count column header');
  assert.match(content, /TableHead[^>]*>Active Status</, 'Expected Active Status column header');
  assert.match(content, /TableHead[^>]*>Actions</, 'Expected Actions column header');
  assert.match(content, /Switch[\s\S]*data-testid="departments-table-active-toggle"/, 'Expected active toggle switch');
  assert.match(content, /DropdownMenuItem[\s\S]*Edit Department/, 'Expected Edit Department action');
  assert.match(content, /View Teams/, 'Expected View Teams action');
  assert.match(content, /View Projects/, 'Expected View Projects action');
  assert.match(content, /Deactivate/, 'Expected Deactivate action text');
});
