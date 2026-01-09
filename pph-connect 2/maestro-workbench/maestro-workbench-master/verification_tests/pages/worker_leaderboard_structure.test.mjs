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
const pagePath = resolvePath('src', 'pages', 'worker', 'Leaderboard.tsx');

test('WorkerLeaderboard page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerLeaderboardPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerLeaderboardPage\b/, 'Expected named WorkerLeaderboardPage export');
  assert.match(content, /export\s+default\s+WorkerLeaderboardPage\b/, 'Expected default WorkerLeaderboardPage export');
});

test('App mounts worker leaderboard routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Leaderboard"\)\)/,
    'Expected lazy import for WorkerLeaderboard page'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/leaderboard"[\s\S]+WorkerLeaderboardPage[\s\S]+\/>/,
    'Expected \/worker\/leaderboard route'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/leaderboard"[\s\S]+WorkerLeaderboardPage[\s\S]+\/>/,
    'Expected \/w\/leaderboard route'
  );
});

test('WorkerLeaderboard page renders all leaderboard sections', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-leaderboard-page"/, 'Expected page test id');
  assert.match(content, /data-testid="worker-leaderboard-earners"/, 'Expected top earners section');
  assert.match(content, /data-testid="worker-leaderboard-quality"/, 'Expected quality section');
  assert.match(content, /data-testid="worker-leaderboard-throughput"/, 'Expected tasks completed section');
  assert.match(content, /data-testid="worker-leaderboard-speed"/, 'Expected completion speed section');
  assert.match(content, /data-testid="leaderboard-entry"/, 'Expected leaderboard entry card');
  assert.match(content, /data-testid="leaderboard-privacy-note"/, 'Expected anonymization notice');
});

test('WorkerLeaderboard page uses leaderboard service helpers', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /from\s+'@\/services\/leaderboardService';/, 'Expected leaderboard service import');
  assert.match(content, /getTopEarnersLeaderboard/i, 'Expected top earners helper usage');
  assert.match(content, /getTopQualityLeaderboard/i, 'Expected quality helper usage');
  assert.match(content, /getMostProductiveLeaderboard/i, 'Expected productivity helper usage');
  assert.match(content, /getFastestCompletionLeaderboard/i, 'Expected speed helper usage');
});
