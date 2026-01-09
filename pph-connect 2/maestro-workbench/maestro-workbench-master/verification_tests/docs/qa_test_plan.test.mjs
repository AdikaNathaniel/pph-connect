import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'qa_test_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'qa_test_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

test('QA test plan exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected qa_test_plan.md to exist in Reference Docs');
  const content = readFileSync(docPath, 'utf8');
  ['Test Objectives', 'Test Environments', 'Manual Test Matrix', 'Pre-Launch Sign-off'].forEach((section) => {
    assert.match(content, new RegExp(`##\\s+${section}`), `Expected section ${section}`);
  });
  assert.match(content, /Worker Marketplace/, 'Expected marketplace coverage');
  assert.match(content, /Messaging/, 'Expected messaging coverage');
  assert.match(content, /Offboarding|performance/, 'Expected lifecycle coverage');
});
