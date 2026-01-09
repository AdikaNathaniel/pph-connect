import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readDoc = (filename) =>
  readFileSync(path.join(process.cwd(), 'verification_tests', 'manual', filename), 'utf8');

test('Create group scenario documented', () => {
  const content = readDoc('group_create.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected create group scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Add/remove members scenario documented', () => {
  const content = readDoc('group_add_remove_members.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected add/remove scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Send group message scenario documented', () => {
  const content = readDoc('group_send_message.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected group message scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('View group info scenario documented', () => {
  const content = readDoc('group_view_info.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected view info scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Leave group scenario documented', () => {
  const content = readDoc('group_leave.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected leave scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Track read status scenario documented', () => {
  const content = readDoc('group_track_read.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected read tracking scenario result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});
