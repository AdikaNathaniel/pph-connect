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

const servicePath = resolvePath('src', 'services', 'notificationService.ts');

test('notificationService exports preference helpers and notification logic', () => {
  assert.ok(existsSync(servicePath), 'Expected notificationService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    'getNotificationPreferences',
    'updateNotificationPreferences',
    'notifyThreadReply',
    'notifyMention',
    'notifyPostUpvote'
  ].forEach((fn) => {
    assert.match(content, new RegExp(`export\\s+(?:async\\s+function|const)\\s+${fn}`), `Expected ${fn} export`);
  });
  assert.match(content, /DEFAULT_PREFERENCES/i, 'Expected preference definition');
});
