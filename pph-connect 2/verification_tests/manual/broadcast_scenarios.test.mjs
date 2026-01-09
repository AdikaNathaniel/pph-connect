import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readDoc = (filename) =>
  readFileSync(path.join(process.cwd(), 'verification_tests', 'manual', filename), 'utf8');

test('Broadcast to department scenario documented', () => {
  const content = readDoc('broadcast_department.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected department broadcast result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Broadcast to team scenario documented', () => {
  const content = readDoc('broadcast_team.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected team broadcast result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Broadcast to all workers scenario documented', () => {
  const content = readDoc('broadcast_all_workers.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected all-workers broadcast result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});

test('Broadcast delivery verification scenario documented', () => {
  const content = readDoc('broadcast_verify_delivery.md');
  assert.match(content, /Result:\s*Pass/i, 'Expected delivery verification result');
  assert.match(content, /Steps:/i, 'Expected steps description');
});
