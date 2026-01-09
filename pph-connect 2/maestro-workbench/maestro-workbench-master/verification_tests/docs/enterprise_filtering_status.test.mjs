import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'enterprise_filtering_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'enterprise_filtering_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Enterprise filtering doc describes filters, hooks, and Supabase queries', () => {
  assert.ok(existsSync(docPath), 'Expected enterprise_filtering_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Workers Filters/i, 'Missing workers filters section');
  assert.match(content, /WorkersPage/i, 'Expected WorkersPage mention');
  assert.match(content, /supabase\.from\('workers'\)/i, 'Expected workers query mention');
  assert.match(content, /department|team/i, 'Expected department/team filter mention');

  assert.match(content, /## Hook/i, 'Missing hook section');
  assert.match(content, /useWorkers/i, 'Expected useWorkers hook mention');

  assert.match(content, /## Saved Views/i, 'Missing saved views section');
  assert.match(content, /localStorage|persist/i, 'Expected persistence mention');
});
