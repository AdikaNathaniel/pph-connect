import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentsDir = path.join(process.cwd(), 'src', 'components', 'messages');

const readComponent = (filename) => {
  const filePath = path.join(componentsDir, filename);
  assert.ok(existsSync(filePath), `Expected ${filename} in src/components/messages`);
  return readFileSync(filePath, 'utf8');
};

test('messages components directory contains CreateGroupDialog', () => {
  assert.ok(
    existsSync(componentsDir),
    'Expected messaging components directory at src/components/messages'
  );

  const filePath = path.join(componentsDir, 'CreateGroupDialog.tsx');
  assert.ok(existsSync(filePath), 'Expected CreateGroupDialog.tsx component');
});

test('CreateGroupDialog integrates Supabase auth and group creation flow', () => {
  const content = readComponent('CreateGroupDialog.tsx');
  assert.match(content, /const\s+CreateGroupDialog\s*:\s*React\.FC/i, 'Expected component definition');
  assert.match(content, /supabase\s*\.\s*auth\s*\.\s*getUser\(\)/i, 'Expected Supabase auth usage');
  assert.match(content, /supabase\s*\.\s*from\('workers'\)/i, 'Expected workers fetch for member selection');
  assert.match(content, /DialogContent/, 'Expected dialog layout for group creation');
  assert.match(content, /onGroupCreated/i, 'Expected onGroupCreated callback wiring');
});
