import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const servicePath = resolvePath('src', 'services', 'workerGoalsService.ts');
const logicPath = resolvePath('src', 'services', 'workerGoalsLogic.ts');

test('workerGoalsService exports helpers for fetching and updating goals', () => {
  assert.ok(existsSync(servicePath), 'Expected workerGoalsService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+async\s+function\s+fetchWorkerGoalsWithProgress/i,
    /export\s+async\s+function\s+upsertWorkerGoal/i,
    /export\s+type\s+WorkerGoalWithProgress/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected pattern ${pattern}`);
  });
});

test('workerGoalsService queries worker_goals, work_stats, and quality_metrics tables', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /supabase[\s\S]+\.from\('worker_goals'\)/i, 'Expected worker_goals select');
  assert.match(content, /supabase[\s\S]+\.from\('work_stats'\)/i, 'Expected work_stats query for progress');
  assert.match(content, /supabase[\s\S]+\.from\('quality_metrics'\)/i, 'Expected quality_metrics query');
  assert.match(content, /calculateGoalProgress/i, 'Expected calculateGoalProgress helper usage');
});

test('workerGoalsLogic exposes calculateGoalProgress for all goal types', () => {
  assert.ok(existsSync(logicPath), 'Expected workerGoalsLogic to exist');
  const content = readFileSync(logicPath, 'utf8');
  assert.match(content, /export\s+function\s+calculateGoalProgress/i, 'Expected calculateGoalProgress export');
  ['tasks', 'quality', 'earnings'].forEach((goalType) => {
    assert.match(
      content,
      new RegExp(goalType, 'i'),
      `Expected logic file to reference ${goalType} goals`
    );
  });
  ['progressValue', 'progressPercent', 'status'].forEach((key) => {
    assert.match(content, new RegExp(key, 'i'), `Expected ${key} in progress payload`);
  });
});
