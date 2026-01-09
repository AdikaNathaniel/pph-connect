import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = path.join(process.cwd(), 'Reference Docs', 'type-usage-guidelines.md');

test('type usage guidelines document exists with key sections', () => {
  const content = readFileSync(docPath, 'utf8');

  assert.match(
    content,
    /Supabase type generation/i,
    'Expected guidelines to mention Supabase type generation'
  );

  assert.match(
    content,
    /Database\s+type/i,
    'Expected guidelines to describe Database type usage'
  );
});
