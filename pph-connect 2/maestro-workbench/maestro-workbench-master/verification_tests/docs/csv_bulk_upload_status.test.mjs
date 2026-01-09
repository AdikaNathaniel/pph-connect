import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'csv_bulk_upload_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'csv_bulk_upload_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('CSV bulk upload status doc covers template, validation, and ingestion', () => {
  assert.ok(existsSync(docPath), 'Expected csv_bulk_upload_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Template/i, 'Missing template section');
  assert.match(content, /generateBulkUploadTemplate/i, 'Expected helper mention');
  assert.match(content, /## Validation/i, 'Missing validation section');
  assert.match(content, /mapRowToWorkerValues/i, 'Expected mapping helper mention');
  assert.match(content, /## Ingestion/i, 'Missing ingestion section');
  assert.match(content, /BulkUploadModal/i, 'Expected modal reference');
});
