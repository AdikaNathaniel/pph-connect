import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const messagingFiles = [
  ['pages', 'messages', 'Inbox.tsx'],
  ['pages', 'messages', 'Thread.tsx'],
  ['pages', 'messages', 'Compose.tsx'],
  ['pages', 'messages', 'Broadcast.tsx'],
  ['pages', 'messages', 'GroupConversation.tsx'],
  ['pages', 'messages', 'GroupInfo.tsx'],
  ['components', 'messages', 'CreateGroupDialog.tsx'],
  ['hooks', 'useMessageNotifications.ts']
];

const read = (segments) =>
  readFileSync(path.join(process.cwd(), 'src', ...segments), 'utf8');

test('messaging code uses workers tables instead of profiles', () => {
  messagingFiles.forEach((segments) => {
    const content = read(segments);
    assert.doesNotMatch(
      content,
      /\bprofiles\b/,
      `Expected ${segments.join('/')} to avoid querying profiles table`
    );
  });
});
