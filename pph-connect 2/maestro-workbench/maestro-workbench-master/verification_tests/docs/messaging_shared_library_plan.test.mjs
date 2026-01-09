import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-shared-library.md');

test('messaging shared library plan exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-shared-library.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Packaging Strategy', '## Extracted Modules', '## Consumption Plan'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /@pph\/messaging/i, 'Expected npm package mention');
  assert.match(content, /packages\/messaging/i, 'Expected monorepo path mention');
});
