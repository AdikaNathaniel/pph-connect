import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'forum-notifications.md'),
    path.join(process.cwd(), 'Reference Docs', 'forum-notifications.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate forum-notifications.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Forum notifications doc lists events and preferences', () => {
  const content = readFileSync(docPath, 'utf8');
  ['Reply to your thread', 'Mention in post', 'Upvotes on your post'].forEach((line) => {
    assert.match(content, new RegExp(line, 'i'), `Expected mention of ${line}`);
  });
  assert.match(content, /Preferences/i, 'Expected preferences section');
  ['email', 'in-app', 'none'].forEach((pref) => {
    assert.match(content, new RegExp(pref, 'i'), `Expected preference ${pref}`);
  });
});
