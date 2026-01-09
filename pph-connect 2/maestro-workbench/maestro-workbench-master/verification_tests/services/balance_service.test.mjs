import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const servicePath = resolvePath('src', 'services', 'balanceService.ts');
const serviceContent = readFileSync(servicePath, 'utf8');

test('balanceService exports aggregation helpers', () => {
  assert.match(serviceContent, /export\s+const\s+calculateWorkerBalance/, 'Expected calculateWorkerBalance export');
  assert.match(serviceContent, /export\s+const\s+getBalanceBreakdown/, 'Expected getBalanceBreakdown export');
});

test('calculateWorkerBalance aggregates earnings from work_stats', () => {
  assert.match(serviceContent, /from\('work_stats'\)/, 'Expected work_stats query');
  assert.match(serviceContent, /sum\('earnings'\)/i, 'Expected SUM(earnings) aggregation');
  assert.match(serviceContent, /gte\('work_date',\s*startDate\)/, 'Expected start date filter');
  assert.match(serviceContent, /lte\('work_date',\s*endDate\)/, 'Expected end date filter');
});

test('getBalanceBreakdown groups earnings by project', () => {
  assert.match(serviceContent, /groupByProject/, 'Expected grouping helper');
  assert.match(serviceContent, /project_id/, 'Expected project_id selection');
});

test('balanceService handles missing earnings gracefully', () => {
  assert.match(serviceContent, /return\s+\{\s*total:\s*0/, 'Expected zero fallback for totals');
  assert.match(serviceContent, /breakdown:\s*\[\]/, 'Expected empty breakdown fallback');
});
