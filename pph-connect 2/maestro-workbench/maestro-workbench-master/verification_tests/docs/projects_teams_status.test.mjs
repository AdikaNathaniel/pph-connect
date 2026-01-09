import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'projects_teams_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'projects_teams_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Projects & Teams status doc covers pages, detail views, and modals', () => {
  assert.ok(existsSync(docPath), 'Expected projects_teams_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Projects Page/i, 'Missing projects section');
  assert.match(content, /ProjectsPage/i, 'Expected ProjectsPage mention');
  assert.match(content, /supabase\.from\('projects'\)/i, 'Expected projects query mention');

  assert.match(content, /## Teams Page/i, 'Missing teams section');
  assert.match(content, /TeamsPage/i, 'Expected TeamsPage mention');
  assert.match(content, /project_teams/i, 'Expected project_teams mention');

  assert.match(content, /## Detail Views/i, 'Missing detail section');
  assert.match(content, /ProjectDetail/i, 'Expected ProjectDetail mention');
  assert.match(content, /TeamDetail/i, 'Expected TeamDetail mention');

  assert.match(content, /## Modals & Actions/i, 'Missing modals section');
  assert.match(content, /AssignToProjectModal|ProjectVisibilityPanel/i, 'Expected modal reference');
});
