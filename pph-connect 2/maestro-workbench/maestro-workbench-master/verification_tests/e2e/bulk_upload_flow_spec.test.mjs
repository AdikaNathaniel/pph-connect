import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'bulk-upload.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'bulk-upload.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Bulk upload Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/bulk-upload.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]Bulk upload/, 'Expected describe block for bulk upload');
});

test('Bulk upload spec walks through template, upload, validate, review, import', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['bulk-upload-dialog', 'bulk-upload-file-input', 'bulk-upload-validation-summary', 'bulk-upload-preview-table', 'bulk-upload-progress'].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} interactions`);
  });
  assert.match(content, /expect\(page\.getByText\('Workers imported'\)\)\.toBeVisible/, 'Expected import confirmation assertion');
});
