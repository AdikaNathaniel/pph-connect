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

const pagePath = resolvePath('src', 'pages', 'worker', 'Dashboard.tsx');

test('WorkerDashboard renders unlock progress widget', () => {
  assert.ok(existsSync(pagePath), 'Expected worker dashboard to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-unlock-progress"/, 'Expected unlock progress section');
  assert.match(content, /getUnlockProgress/i, 'Expected progress summary helper usage');
  assert.match(content, /data-testid="worker-unlock-progress-bar"/i, 'Expected visual progress bar');
  assert.match(content, /data-testid="worker-unlock-requirements"/i, 'Expected requirement checklist');
  assert.match(content, /Next unlock/i, 'Expected next unlock messaging');
});
