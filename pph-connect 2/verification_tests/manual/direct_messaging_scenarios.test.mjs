import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readDoc = (filename) =>
  readFileSync(path.join(process.cwd(), 'verification_tests', 'manual', filename), 'utf8');

test('Worker to manager direct message scenario documented', () => {
  const content = readDoc('direct_message_worker_to_manager.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected worker→manager scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Manager to worker direct message scenario documented', () => {
  const content = readDoc('direct_message_manager_to_worker.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected manager→worker scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Reply to thread scenario documented', () => {
  const content = readDoc('reply_to_thread.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected reply scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('View thread history scenario documented', () => {
  const content = readDoc('view_thread_history.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected history scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Mark as read scenario documented', () => {
  const content = readDoc('mark_as_read.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected mark-as-read scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});
