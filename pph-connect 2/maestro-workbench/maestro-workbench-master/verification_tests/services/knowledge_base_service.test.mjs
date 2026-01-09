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

const servicePath = resolvePath('src', 'services', 'knowledgeBaseService.ts');

test('knowledgeBaseService exports creation, upload, and version helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected knowledgeBaseService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    'export\\s+type\\s+KnowledgeBaseArticleStatus',
    'export\\s+const\\s+KNOWLEDGE_BASE_STATUSES',
    'export\\s+type\\s+KnowledgeBaseArticleInput',
    'export\\s+async\\s+function\\s+createKnowledgeBaseArticle',
    'export\\s+async\\s+function\\s+uploadKnowledgeBaseAsset',
    'export\\s+async\\s+function\\s+fetchKnowledgeBaseVersions'
  ].forEach((pattern) => {
    assert.match(content, new RegExp(pattern), `Expected ${pattern} in service file`);
  });
});
