import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

const messagingSpecPath = resolvePath('tests', 'integration', 'api', 'messagingFlows.test.ts');

test('Messaging integration spec validates thread creation and notifications', () => {
  assert.ok(existsSync(messagingSpecPath), 'Expected messagingFlows.test.ts to exist');
  const content = readFileSync(messagingSpecPath, 'utf8');
  assert.match(content, /Messaging API Flows/, 'Expected suite title');
  assert.match(content, /create direct thread/i, 'Expected direct thread coverage');
  assert.match(content, /post message/i, 'Expected message posting coverage');
  assert.match(content, /mark thread as read/i, 'Expected read receipt coverage');
});
