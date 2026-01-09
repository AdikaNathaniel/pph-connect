import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const docPath = path.join(process.cwd(), 'Reference Docs', 'testing-framework-plan.md');

test('testing framework plan doc exists with required details', () => {
  assert.ok(existsSync(docPath), 'Expected testing-framework-plan.md to exist');
  const content = readFileSync(docPath, 'utf8');
  ['## Framework Choice', '## TypeScript Configuration', '## Test Utilities'].forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });
  assert.match(content, /Vitest|Jest/i, 'Expected framework mention');
  assert.match(content, /Supabase/i, 'Expected Supabase mocking mention');
});
