import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readDoc = (filename) =>
  readFileSync(path.join(process.cwd(), 'verification_tests', 'manual', filename), 'utf8');

test('Attachment upload scenario documented', () => {
  const content = readDoc('attachments_upload.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected upload scenario result');
  assert.match(content, /Steps:/i, 'Expected upload steps description');
});

test('Attachment download scenario documented', () => {
  const content = readDoc('attachments_download.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected download scenario result');
  assert.match(content, /Steps:/i, 'Expected download steps description');
});

test('Attachment storage permissions scenario documented', () => {
  const content = readDoc('attachments_storage_permissions.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected storage permissions scenario result');
  assert.match(content, /Steps:/i, 'Expected storage permission steps description');
});
