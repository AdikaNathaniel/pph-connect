import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const hookPath = path.join(process.cwd(), 'src', 'hooks', 'useMessageNotifications.ts');

test('useMessageNotifications hook file exists with expected exports', () => {
  assert.ok(existsSync(hookPath), 'Expected useMessageNotifications.ts to exist under src/hooks');
  const content = readFileSync(hookPath, 'utf8');
  assert.match(content, /export\s+const\s+useMessageNotifications/i, 'Expected named hook export');
  assert.match(content, /supabase\s*\.\s*auth\s*\.\s*getUser\(\)/i, 'Expected Supabase auth usage');
  assert.match(content, /from\('message_recipients'\)/i, 'Expected message recipients query for unread counts');
  assert.match(content, /useEffect\s*\(/i, 'Expected useEffect for polling/subscriptions');
  assert.match(content, /refreshUnreadCount/i, 'Expected refresh helper to be returned');
});
