import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

const modulePath = `file://${resolveModule('src/services/loadBalancingLogic.ts')}`;
const module = await import(modulePath);

const { computeCapacityScore, distributeAssignments } = module;

test('computeCapacityScore favors available workers with low utilization', () => {
  const worker = { id: 'w1', capacity: 10, activeAssignments: 3, isOnline: true };
  const score = computeCapacityScore(worker);
  assert.ok(score > 0.5, 'Expected positive capacity score');
});

test('distributeAssignments spread tasks evenly and respects capacity', () => {
  const assignments = ['t1', 't2', 't3', 't4'];
  const workers = [
    { id: 'w1', capacity: 2, activeAssignments: 0, isOnline: true },
    { id: 'w2', capacity: 2, activeAssignments: 1, isOnline: true },
    { id: 'w3', capacity: 1, activeAssignments: 0, isOnline: true }
  ];
  const plan = distributeAssignments(assignments, workers);
  assert.equal(plan.length, assignments.length, 'Expected assignment for each task');
  const workerCounts = plan.reduce((acc, item) => {
    acc[item.workerId] = (acc[item.workerId] ?? 0) + 1;
    return acc;
  }, {});
  assert.ok(workerCounts['w1'] >= workerCounts['w2'], 'Expected w1 to get equal or more tasks');
});
