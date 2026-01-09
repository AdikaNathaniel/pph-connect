import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = path.join(process.cwd(), 'src', 'pages', 'messages');

const readPage = (filename) => {
  const filePath = path.join(pagesDir, filename);
  assert.ok(existsSync(filePath), `Expected ${filename} to exist under src/pages/messages`);
  return readFileSync(filePath, 'utf8');
};

test('messages pages directory contains expected entry points', () => {
  assert.ok(
    existsSync(pagesDir),
    'Expected messaging pages directory at src/pages/messages'
  );

  const expectedPages = [
    'Inbox.tsx',
    'Thread.tsx',
    'Compose.tsx',
    'Broadcast.tsx',
    'GroupConversation.tsx',
    'GroupInfo.tsx'
  ];

  expectedPages.forEach((file) => {
    assert.ok(
      existsSync(path.join(pagesDir, file)),
      `Expected messaging page ${file} to be present`
    );
  });
});

test('Thread page wires Supabase, auth context, and rich text editor', () => {
  const content = readPage('Thread.tsx');
  assert.match(content, /const\s+Thread\s*:\s*React\.FC/i, 'Expected Thread component definition');
  assert.match(
    content,
    /useParams<\s*\{\s*threadId\s*:\s*string\s*\}\s*>\(\)/i,
    'Expected threadId route parameter usage'
  );
  assert.match(content, /supabase\.auth\.getUser\(\)/i, 'Expected Supabase auth lookup');
  assert.match(content, /RichTextEditor\s+from\s+'@\/components\/messaging\/RichTextEditor'/, 'Expected RichTextEditor import');
  assert.match(content, /toast\.error/i, 'Expected toast notifications in Thread page');
});

test('Inbox page lists threads and supports navigation', () => {
  const content = readPage('Inbox.tsx');
  assert.match(content, /const\s+Inbox\s*:\s*React\.FC/i, 'Expected Inbox component definition');
  assert.match(content, /useNavigate\(\)/i, 'Expected navigation hook for inbox actions');
  assert.match(
    content,
    /supabase\s*\.\s*from\('message_recipients'\)/i,
    'Expected Supabase message_recipients query'
  );
  assert.match(
    content,
    /supabase\s*\.\s*from\('messages'\)/i,
    'Expected Supabase messages query'
  );
  assert.match(content, /CreateGroupDialog/, 'Expected group management dialog integration');
  assert.match(content, /TabsList/, 'Expected tabbed inbox navigation');
});

test('Compose page loads recipients, handles attachments, and uses rich text editor', () => {
  const content = readPage('Compose.tsx');
  assert.match(content, /const\s+Compose\s*:\s*React\.FC/i, 'Expected Compose component definition');
  assert.match(
    content,
    /supabase\s*\.\s*from\('workers'\)/i,
    'Expected workers query for recipient list'
  );
  assert.match(content, /setRecipients/i, 'Expected state setter for recipients');
  assert.match(content, /RichTextEditor/, 'Expected rich text editor usage in Compose');
  assert.match(
    content,
    /type="file"[\s\S]*multiple/i,
    'Expected file input for attachments'
  );
});
