import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docCandidates = [
  path.join(process.cwd(), 'Reference Docs', 'auth-setup.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'auth-setup.md')
];

const docPath = (() => {
  const match = docCandidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate Reference Docs/auth-setup.md');
  }
  return match;
})();

function readDoc() {
  return readFileSync(docPath, 'utf8');
}

test('auth setup guide covers Supabase configuration checklist', () => {
  const content = readDoc();

  assert.match(content, /Supabase Auth Configuration/i, 'Expected heading for Supabase Auth configuration');
  assert.match(content, /SUPABASE_ANON_KEY/i, 'Expected environment variable notes');
  assert.match(content, /redirect URLs/i, 'Expected redirect URL guidance');
  assert.match(content, /email templates/i, 'Expected email template setup section');
  assert.match(content, /Testing the flow/i, 'Expected testing instructions');
});
