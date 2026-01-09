import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'knowledge-base-structure.md'),
    path.join(process.cwd(), 'Reference Docs', 'knowledge-base-structure.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate knowledge-base-structure.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Knowledge base structure doc lists required categories and article details', () => {
  const content = readFileSync(docPath, 'utf8');
  ['Getting Started', 'Best Practices', 'Troubleshooting', 'Policies'].forEach((category) => {
    assert.match(content, new RegExp(category, 'i'), `Expected category ${category}`);
  });
  assert.match(content, /rich text/i, 'Expected reference to rich text content');
  assert.match(content, /search/i, 'Expected search mention');
});
