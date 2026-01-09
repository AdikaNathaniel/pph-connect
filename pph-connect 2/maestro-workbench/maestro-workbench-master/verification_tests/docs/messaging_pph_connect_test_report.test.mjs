import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-pph-connect-test-report.md');

test('messaging test report doc exists with required content', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-pph-connect-test-report.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Test Matrix', '## Cross-user Messaging', '## Edge Cases', '## Follow-ups'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /admin ↔ manager ↔ worker/i, 'Expected cross-user coverage');
  assert.match(content, /offline/i, 'Expected offline mention');
});
