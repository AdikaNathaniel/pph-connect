import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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

const servicePath = resolvePath('src', 'services', 'lowQualityTaskService.ts');

test('lowQualityTaskService exports reassignLowQualityTask', () => {
  assert.ok(existsSync(servicePath), 'Expected lowQualityTaskService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+interface\s+LowQualityTaskInput/, 'Expected input interface');
  assert.match(content, /export\s+async\s+function\s+reassignLowQualityTask/, 'Expected reassignLowQualityTask export');
});

test('lowQualityTaskService updates tasks and logs events', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /from\('tasks'\)\s*\.\s*update/, 'Expected tasks update');
  assert.match(content, /from\('task_reassignment_events'\)\s*\.\s*insert/, 'Expected event insert');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/, 'Expected send-message invocation');
});
