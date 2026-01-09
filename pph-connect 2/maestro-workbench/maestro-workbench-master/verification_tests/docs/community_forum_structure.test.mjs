import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'community-forum-structure.md'),
    path.join(process.cwd(), 'Reference Docs', 'community-forum-structure.md')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate community-forum-structure.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Community forum structure doc outlines categories and features', () => {
  const content = readFileSync(docPath, 'utf8');
  ['General', 'Project-specific', 'Training', 'Feedback'].forEach((category) => {
    assert.match(content, new RegExp(category, 'i'), `Expected ${category} category definition`);
  });
  assert.match(content, /threads/i, 'Expected threads section');
  assert.match(content, /repl(y|ies)/i, 'Expected replies section');
  assert.match(content, /upvote|vote/i, 'Expected voting mention');
});
