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

test('App defines /worker/dashboard alias for worker layout', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /<Route\s+path="\/worker\/dashboard"[\s\S]+?<WorkerDashboard\s*\/>/,
    'Expected /worker/dashboard route rendering WorkerDashboard'
  );
});
