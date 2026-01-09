import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const componentPath = resolvePath(['src', 'components', 'worker', 'AssignToProjectModal.tsx']);

test('AssignToProjectModal exports expected component API', () => {
  assert.ok(existsSync(componentPath), 'Expected AssignToProjectModal.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+AssignToProjectModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+AssignToProjectModal\b/, 'Expected named AssignToProjectModal export');
  assert.match(content, /export\s+default\s+AssignToProjectModal\b/, 'Expected default export');
});

test('AssignToProjectModal renders multi-select project list and filters', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*Command,\s*CommandEmpty,\s*CommandGroup,\s*CommandInput,\s*CommandItem,\s*CommandList\s*\}\s+from\s+'@\/components\/ui\/command';/,
    'Expected command palette components for multi-select list'
  );
  assert.match(
    content,
    /data-testid="assign-projects-department-filter"/,
    'Expected department filter control test id'
  );
  assert.match(
    content,
    /data-testid="assign-projects-project-option"/,
    'Expected project option test id on selectable items'
  );
  assert.match(
    content,
    /data-testid="assign-projects-submit"/,
    'Expected confirm button test id'
  );
  assert.match(
    content,
    /import\s+\{\s*[^}]*showInfoToast[^}]*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper import for validation feedback'
  );
  assert.match(content, /showInfoToast\(/, 'Expected info toast helper for validation feedback');
});

test('AssignToProjectModal creates new worker_assignments records', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /supabase[\s\S]*\.from\('projects'\)[\s\S]*(?:eq\('status',\s*'active'\)|in\('status',\s*\[['"]active['"]])/,
    'Expected Supabase query to load active projects'
  );
  assert.match(
    content,
    /const\s+availableProjects\s*=\s*useMemo\([\s\S]*!\s*existingProjectIds\.includes/,
    'Expected filtering to exclude already assigned projects'
  );
  assert.match(
    content,
    /const\s+\{[\s\S]*error:\s*insertError[\s\S]*\}\s*=\s*await\s+supabase[\s\S]*\.from\('worker_assignments'\)[\s\S]*\.insert/,
    'Expected insertion into worker_assignments table'
  );
  assert.match(
    content,
    /assigned_by:\s*currentUserId/,
    'Expected assigned_by field to reference current user'
  );
  assert.match(
    content,
    /showSuccessToast\(/,
    'Expected success toast helper after insert'
  );
  assert.match(
    content,
    /onSuccess\?\.\(\)/,
    'Expected optional success callback invocation to refresh parent view'
  );
});
