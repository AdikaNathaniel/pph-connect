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
const pagePath = resolvePath('src', 'pages', 'manager', 'InvoicePreviewPage.tsx');

test('InvoicePreviewPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected InvoicePreviewPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+InvoicePreviewPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+InvoicePreviewPage\b/, 'Expected default export');
});

test('App mounts invoice preview route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/InvoicePreviewPage"\)\)/,
    'Expected lazy import for InvoicePreviewPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/invoices\/[^:]*:id\/preview"[\s\S]+InvoicePreviewPage[\s\S]+\/>/,
    'Expected invoice preview route'
  );
});

test('InvoicePreviewPage renders header, summary, line items, adjustments, and actions', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="invoice-preview-header"',
    'data-testid="invoice-preview-summary"',
    'data-testid="invoice-preview-lines"',
    'data-testid="invoice-preview-adjustments"',
    'data-testid="invoice-preview-actions"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /useEffect\(/, 'Expected data load effect');
  assert.match(content, /generateInvoicePreview/, 'Expected InvoiceService usage');
});
