import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const modalPath = resolvePath(['src', 'components', 'project', 'AssignTeamsModal.tsx']);

test('AssignTeamsModal exports component contract', () => {
  assert.ok(existsSync(modalPath), 'Expected AssignTeamsModal.tsx to exist');
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /export\s+interface\s+AssignTeamsModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+AssignTeamsModal\b/, 'Expected named component export');
  assert.match(content, /export\s+default\s+AssignTeamsModal\b/, 'Expected default export');
});

test('AssignTeamsModal loads teams, supports filtering, and multi-select', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /useEffect/, 'Expected effect to load teams');
  assert.match(content, /data-testid="assign-teams-filter-locale"/, 'Expected locale filter test id');
  assert.match(content, /Command/, 'Expected command list for search/multi-select');
  assert.match(content, /Checkbox[^>]*onCheckedChange/, 'Expected checkbox for team selection');
  assert.match(content, /selectedTeams\.includes/, 'Expected selection tracking');
  assert.match(content, /data-testid="assign-teams-submit"/, 'Expected submit button test id');
});

test('AssignTeamsModal inserts project_teams records with audit fields', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /supabase\.from\('project_teams'\)\.insert/, 'Expected insert into project_teams');
  assert.match(content, /assigned_at:\s*timestamp/, 'Expected assigned_at timestamp');
  assert.match(content, /assigned_by:\s*userId/, 'Expected assigned_by audit field');
  assert.match(
    content,
    /import\s+\{\s*showSuccessToast,\s*showErrorToast(?:,\s*showInfoToast\s*)?\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper imports'
  );
  assert.match(content, /showSuccessToast\(/, 'Expected success toast helper usage');
  assert.match(content, /showErrorToast\(/, 'Expected error toast helper usage');
  assert.match(content, /onSuccess\?\.\(\)/, 'Expected onSuccess callback to refresh parent');
});
