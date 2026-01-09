import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-architecture.md');

test('messaging architecture doc exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-architecture.md to exist');
  const content = readFileSync(docPath, 'utf8');
  [
    '## Architecture Decision',
    '## API Contracts',
    '## Data Flow & Worker Integration'
  ].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /Standalone service vs integrated module/i, 'Expected decision rationale');
  assert.match(content, /Workers table/, 'Expected workers table references');
});
