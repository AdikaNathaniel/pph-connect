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

test('InvoiceService exposes generateInvoicePreview', async () => {
  assert.ok(existsSync(servicePath), 'Expected invoiceService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+generateInvoicePreview\(/, 'Expected generateInvoicePreview export');
  assert.match(content, /import\s+\{\s*supabase\s*\}\s+from\s+'@\/integrations\/supabase\/client';/, 'Expected supabase import');
  assert.match(content, /from\s+'@\/services\/balanceService';/, 'Expected balance service import');
  assert.match(content, /from\s+'@\/services\/rateService';/, 'Expected rate service import');
});

