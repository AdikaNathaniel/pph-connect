import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-dependencies.md');

test('messaging dependencies doc exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-dependencies.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Messaging-specific code', '## Shared utilities', '## Maestro-only adaptations'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /Messaging Modules Table/i, 'Expected Messaging Modules Table mention');
});
