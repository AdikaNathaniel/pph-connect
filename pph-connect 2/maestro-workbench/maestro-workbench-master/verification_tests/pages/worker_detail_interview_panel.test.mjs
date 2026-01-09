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

const pagePath = resolvePath('src', 'pages', 'manager', 'WorkerDetail.tsx');

test('WorkerDetail page renders interviews section', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerDetail page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-interviews-panel"/, 'Expected interviews panel test id');
  assert.match(content, /supabase[\s\S]*\.from\('ai_interviews'\)/, 'Expected ai_interviews query');
  assert.match(content, /Link\s+to\s+transcript|View transcript/i, 'Expected transcript link or button');
});
