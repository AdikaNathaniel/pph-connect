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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'SkillTree.tsx');

test('WorkerSkillTree page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerSkillTreePage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerSkillTreePage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerSkillTreePage\b/, 'Expected default export');
});

test('App mounts worker skill tree routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/SkillTree"\)\)/,
    'Expected lazy import for WorkerSkillTree page'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/skill-tree"[\s\S]+WorkerSkillTreePage[\s\S]+\/>/,
    'Expected \/worker\/skill-tree route'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/skill-tree"[\s\S]+WorkerSkillTreePage[\s\S]+\/>/,
    'Expected \/w\/skill-tree route'
  );
});

test('WorkerSkillTree page renders skill graph with nodes and details', () => {
  const content = readFileSync(pagePath, 'utf8');
  ['data-testid="worker-skill-tree-page"', 'data-testid="skill-tree-graph"', 'data-testid="skill-tree-node"', 'data-testid="skill-tree-details"'].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /Tabs/i, 'Expected tabs for skill categories');
});

test('WorkerSkillTree page uses skill tree service', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /from\s+'@\/services\/skillTreeService';/, 'Expected skillTreeService import');
  assert.match(content, /getWorkerSkillTreeProgress/i, 'Expected progress helper usage');
});
