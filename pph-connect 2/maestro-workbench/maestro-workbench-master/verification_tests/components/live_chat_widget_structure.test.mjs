import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const widgetPath = resolvePath('src', 'components', 'support', 'LiveChatWidget.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('LiveChatWidget exposes floating button, chat window, and escalate control', () => {
  const content = readFileSync(widgetPath, 'utf8');
  ['data-testid="live-chat-widget"', 'data-testid="live-chat-window"', 'data-testid="live-chat-escalate"'].forEach(
    (token) => {
      assert.match(content, new RegExp(token), `Expected ${token}`);
    }
  );
  assert.match(content, /24\/7/i, 'Expected mention of 24/7 availability');
  assert.match(content, /escalate/i, 'Expected escalate instructions');
});

test('LiveChatWidget is mounted whenever a user is authenticated', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(content, /import\s+LiveChatWidget\s+from\s+"@\/components\/support\/LiveChatWidget"/, 'Expected import');
  assert.match(
    content,
    /{isAuthenticated\s+&&[\s\S]+<LiveChatWidget\s+\/>/,
    'Expected LiveChatWidget rendered when any authenticated user is active'
  );
});
