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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'manager', 'InvoiceManagementPage.tsx');

test('InvoiceManagementPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected InvoiceManagementPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+InvoiceManagementPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+InvoiceManagementPage\b/, 'Expected default export');
});

test('App mounts invoice management route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/InvoiceManagementPage"\)\)/,
    'Expected lazy import for InvoiceManagementPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/invoices"[\s\S]+InvoiceManagementPage[\s\S]+\/>/,
    'Expected /invoices route'
  );
});

test('InvoiceManagementPage renders list, filters, and summary widgets', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="invoice-management-header"',
    'data-testid="invoice-management-filters"',
    'data-testid="invoice-management-table"',
    'data-testid="invoice-management-summary"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /useEffect\(/, 'Expected data loading effect');
  assert.match(content, /supabase[\s\S]*\.from\('invoices'\)/, 'Expected invoices query');
});
