import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-sync-plan.md');

test('messaging sync plan doc exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-sync-plan.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Source of Truth', '## Sync Process', '## Automation Ideas'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /Maestro Workbench/i, 'Expected Maestro mention');
  assert.match(content, /PPH Connect/i, 'Expected PPH Connect mention');
});
