import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'invoice_generation_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'invoice_generation_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Invoice generation status doc captures preview, creation, and offboarding hooks', () => {
  assert.ok(existsSync(docPath), 'Expected invoice_generation_status.md to exist');
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /## Preview Flow/i, 'Missing preview section');
  assert.match(content, /generateInvoicePreview/i, 'Expected preview helper mention');
  assert.match(content, /## Creation Flow/i, 'Missing creation section');
  assert.match(content, /createInvoice/i, 'Expected createInvoice mention');
  assert.match(content, /## Offboarding Integration/i, 'Missing offboarding section');
  assert.match(content, /processOffboardingStep/i, 'Expected offboarding process reference');
});
