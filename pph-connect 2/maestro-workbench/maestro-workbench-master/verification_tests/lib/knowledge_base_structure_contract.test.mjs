import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const structurePath = resolvePath(['src', 'lib', 'knowledgeBase', 'structure.ts']);

test('knowledge base structure module exists with required exports', () => {
  assert.ok(existsSync(structurePath), 'Expected src/lib/knowledgeBase/structure.ts to exist');
  const content = readFileSync(structurePath, 'utf8');

  assert.match(content, /export\s+type\s+KnowledgeBaseCategory/i, 'Expected KnowledgeBaseCategory type');
  assert.match(content, /export\s+const\s+knowledgeBaseCategories/i, 'Expected knowledgeBaseCategories export');
  ['Getting Started', 'Best Practices', 'Troubleshooting', 'Policies'].forEach((category) => {
    assert.match(content, new RegExp(category, 'i'), `Expected category ${category}`);
  });

  assert.match(content, /export\s+type\s+KnowledgeBaseArticle/i, 'Expected KnowledgeBaseArticle type');
  assert.match(content, /export\s+const\s+knowledgeBaseArticles/i, 'Expected knowledgeBaseArticles export');
  assert.match(
    content,
    /content:\s*`[^`]+`/m,
    'Expected article content block to use rich text/markdown'
  );
});

test('knowledge base structure exposes lookup helpers', () => {
  const content = readFileSync(structurePath, 'utf8');
  assert.match(content, /export\s+const\s+knowledgeBaseCategoryMap/i, 'Expected category map export');
  assert.match(content, /export\s+function\s+getCategoryById/i, 'Expected getCategoryById helper');
  assert.match(content, /export\s+function\s+getArticlesByCategory/i, 'Expected getArticlesByCategory helper');
});
