import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'worker_detail_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'worker_detail_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Worker detail status doc captures tabs and data sources', () => {
  assert.ok(existsSync(docPath), 'Expected worker_detail_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Overview/i, 'Missing overview section');
  assert.match(content, /## Tabs/i, 'Missing tabs section');
  assert.match(content, /Accounts/i, 'Expected Accounts tab mention');
  assert.match(content, /Projects/i, 'Expected Projects tab mention');
  assert.match(content, /Training/i, 'Expected Training tab mention');
  assert.match(content, /Qualifications/i, 'Expected Qualifications tab mention');
  assert.match(content, /Earnings/i, 'Expected Earnings tab mention');
  assert.match(content, /Invoices/i, 'Expected Invoices tab mention');
  assert.match(content, /Activity/i, 'Expected Activity tab mention');
  assert.match(content, /## Supabase Queries/i, 'Missing Supabase query section');
  assert.match(content, /worker_assignments|worker_accounts/i, 'Expected worker_* tables mention');
});
