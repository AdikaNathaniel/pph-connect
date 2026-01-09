import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'manual_test_matrix.md'),
    path.join(process.cwd(), 'Reference Docs', 'manual_test_matrix.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

const flows = [
  'Worker Marketplace',
  'Manager Operations',
  'Messaging Collaboration',
  'Lifecycle & Compliance',
];

test('Manual test matrix exists with flow tables and ownership', () => {
  assert.ok(existsSync(docPath), 'Expected manual_test_matrix.md to exist');
  const content = readFileSync(docPath, 'utf8');

  ['## Test Coverage Overview', '## User Flows', '## Test Cases', '## QA Ownership'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });

  flows.forEach((flow) => {
    assert.match(content, new RegExp(`\| ${flow}`), `Expected user flow entry for ${flow}`);
  });

  assert.match(content, /Assignments\s*\|/, 'Expected ownership table');
});
