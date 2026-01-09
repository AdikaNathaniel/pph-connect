import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'messaging-migration-plan.md');

test('messaging migration plan doc exists with required sections', () => {
  assert.ok(existsSync(docPath), 'Expected messaging-migration-plan.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## File Copy Plan', '## Import Path Updates', '## Profiles to Workers Mapping', '## Testing Strategy'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /src\/components\/messages/i, 'Expected mention of messaging components');
  assert.match(content, /workers table/i, 'Expected workers table mapping detail');
});
