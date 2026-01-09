import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-maestro-test-report.md');

test('messaging Maestro test report includes required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-maestro-test-report.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Regression Checklist', '## Backward Compatibility', '## Issues Found', '## Next Steps'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /Maestro Workbench/i, 'Expected Maestro mention');
});
