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
const pagePath = resolvePath(['src', 'pages', 'manager', 'ProjectsPage.tsx']);

test('ProjectsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected ProjectsPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ProjectsPage\b/, 'Expected named ProjectsPage export');
  assert.match(content, /export\s+default\s+ProjectsPage\b/, 'Expected default ProjectsPage export');
});

test('App mounts ProjectsPage for /m/projects', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /import\s+ProjectsPage\s+from\s+"\.\/pages\/manager\/ProjectsPage";/,
    'Expected ProjectsPage import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/projects"\s+element=\{\s*<ProtectedRoute[^>]*>\s*<ManagerLayout[^>]*>\s*<ProjectsPage\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/projects route to render ProjectsPage in layout'
  );
});

test('ProjectsPage renders layout shell with title, actions, filters, and add modal wiring', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /import\s+AddProjectModal\s+from\s+'@\/components\/project\/AddProjectModal';/, 'Expected AddProjectModal import');
  assert.match(content, /const\s+\[isAddModalOpen,\s*setAddModalOpen\]\s*=\s*useState/, 'Expected modal visibility state');
  assert.match(content, /data-testid="projects-page-title"/, 'Expected title test id');
  assert.match(content, /data-testid="projects-page-actions"/, 'Expected actions bar test id');
  assert.match(content, /onClick=\{\(\)\s*=>\s*setAddModalOpen\(true\)\}/, 'Expected Add Project button to open modal');
  assert.match(content, /data-testid="projects-page-search"/, 'Expected search input test id');
  assert.match(content, /data-testid="projects-page-filters"/, 'Expected filters container test id');
  assert.match(content, /const\s+fetchProjects\s*=\s*useCallback/, 'Expected data fetching hook placeholder');
  assert.match(
    content,
    /<AddProjectModal\s+open=\{isAddModalOpen\}\s+onClose=\{\(\)\s*=>\s*setAddModalOpen\(false\)\}\s+onSuccess=\{fetchProjects\}\s*\/>/,
    'Expected AddProjectModal usage with callbacks'
  );
});
