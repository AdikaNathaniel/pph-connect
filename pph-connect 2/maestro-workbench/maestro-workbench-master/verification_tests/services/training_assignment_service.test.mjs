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

const servicePath = resolvePath('src', 'services', 'trainingAssignmentService.ts');
const content = readFileSync(servicePath, 'utf8');

test('trainingAssignmentService exports assignment helpers', () => {
  [
    /export\s+async\s+function\s+assignTrainingForWorker/i,
    /export\s+async\s+function\s+markTrainingCompleted/i,
    /export\s+async\s+function\s+fetchTrainingAssignments/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} export`);
  });
});

test('trainingAssignmentService queries skills, training modules, and assignments', () => {
  assert.match(content, /supabase[\s\S]+\.from\('worker_skills'\)/i, 'Expected worker skills query');
  assert.match(content, /supabase[\s\S]+\.from\('training_modules'\)/i, 'Expected training modules query');
  assert.match(content, /supabase[\s\S]+\.from\('worker_training_assignments'\)/i, 'Expected assignments table usage');
  assert.match(content, /supabase[\s\S]+\.from\('worker_training_completions'\)/i, 'Expected completion persistence');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/i, 'Expected notification trigger');
});
