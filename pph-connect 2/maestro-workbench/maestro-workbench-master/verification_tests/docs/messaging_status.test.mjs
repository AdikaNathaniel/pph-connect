import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'messaging_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'messaging_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Messaging status doc covers architecture, components, permissions, and tests', () => {
  assert.ok(existsSync(docPath), 'Expected messaging_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Architecture/i, 'Missing architecture section');
  assert.match(content, /message_threads|message_groups/i, 'Expected Supabase tables mention');
  assert.match(content, /Edge Functions/i, 'Expected edge functions mention');

  assert.match(content, /## Components/i, 'Missing components section');
  assert.match(content, /Inbox|Thread|Broadcast/i, 'Expected messaging components mention');
  assert.match(content, /useMessageNotifications/i, 'Expected hook mention');

  assert.match(content, /## Permissions/i, 'Missing permissions section');
  assert.match(content, /ProtectedRoute|RLS/i, 'Expected RLS mention');

  assert.match(content, /## Tests/i, 'Missing tests section');
  assert.match(content, /verification_tests/i, 'Expected verification tests mention');
});
