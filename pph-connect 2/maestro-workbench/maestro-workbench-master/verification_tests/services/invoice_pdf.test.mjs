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

const servicePath = resolvePath('src', 'services', 'invoiceService.ts');

test('InvoiceService exports generateInvoicePdf helper', () => {
  assert.ok(existsSync(servicePath), 'Expected invoiceService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+generateInvoicePdf\(/, 'Expected generateInvoicePdf export');
  assert.match(content, /from\s+'pdfkit';/, 'Expected pdfkit import');
  assert.match(content, /generateInvoicePreview\(/, 'Expected PDF helper to reuse preview data');
});
