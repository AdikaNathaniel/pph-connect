import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

const logicModule = await import(
  `file://${resolveModule('src/services/bgcMonitoringLogic.ts')}`
);

const { evaluateBGCStatuses } = logicModule;

test('evaluateBGCStatuses groups workers by reminder windows and overdue', () => {
  const today = new Date('2025-11-20T00:00:00Z');
  const workers = [
    { id: 'w1', full_name: 'Alice', bgc_expiration_date: '2026-02-20' }, // >60
    { id: 'w2', full_name: 'Bob', bgc_expiration_date: '2026-01-15' }, // within 60
    { id: 'w3', full_name: 'Cam', bgc_expiration_date: '2025-12-18' }, // within 30
    { id: 'w4', full_name: 'Dev', bgc_expiration_date: '2025-11-24' }, // within 7
    { id: 'w5', full_name: 'Eve', bgc_expiration_date: '2025-11-10', status: 'active' }, // overdue
    { id: 'w6', full_name: 'Finn', bgc_expiration_date: null }, // ignored
  ];

  const result = evaluateBGCStatuses(workers, today);

  assert.equal(result.remind60.length, 1, 'Expected one 60-day reminder');
  assert.equal(result.remind30.length, 1, 'Expected one 30-day reminder');
  assert.equal(result.remind7.length, 1, 'Expected one 7-day reminder');
  assert.equal(result.overdue.length, 1, 'Expected one overdue worker');
  assert.equal(result.remind60[0].id, 'w2');
  assert.equal(result.remind30[0].id, 'w3');
  assert.equal(result.remind7[0].id, 'w4');
  assert.equal(result.overdue[0].id, 'w5');
});
