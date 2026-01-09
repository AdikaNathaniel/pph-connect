import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readDoc = (filename) =>
  readFileSync(path.join(process.cwd(), 'verification_tests', 'manual', filename), 'utf8');

test('Unread badge scenario documented', () => {
  const content = readDoc('notifications_unread_badge.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected unread badge scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Realtime notification scenario documented', () => {
  const content = readDoc('notifications_realtime.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected realtime scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Notification clearing scenario documented', () => {
  const content = readDoc('notifications_clear_on_read.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected clearing scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});
