import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'create-project-listing.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'create-project-listing.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Create project listing spec imports helpers and supabase client', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/create-project-listing.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}/, 'Expected helper import');
  assert.match(content, /createClient/, 'Expected supabase admin client usage');
});

test('Create project listing spec fills listing form and checks table', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['project-listing-form', 'project-listing-project-id', 'project-listing-submit', 'project-listings-table'].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token} usage`);
  });
  assert.match(content, /getByText\('Listing created'\)/, 'Expected success toast assertion');
});
