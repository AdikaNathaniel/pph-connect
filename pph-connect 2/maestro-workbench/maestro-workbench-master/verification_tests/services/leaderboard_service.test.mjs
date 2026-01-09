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

const servicePath = resolvePath('src', 'services', 'leaderboardService.ts');

test('leaderboardService exposes earners and quality helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected leaderboardService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    'getTopEarnersLeaderboard',
    'getTopQualityLeaderboard',
    'getMostProductiveLeaderboard',
    'getFastestCompletionLeaderboard'
  ].forEach((fn) => {
    assert.match(content, new RegExp(`export\\s+(?:async\\s+function|const)\\s+${fn}`), `Expected ${fn} export`);
  });
  assert.match(content, /supabase[\s\S]*\.from\('work_stats'\)/i, 'Expected work_stats query');
  assert.match(content, /supabase[\s\S]*\.from\('quality_metrics'\)/i, 'Expected quality_metrics query');
  assert.match(content, /units_completed/i, 'Expected throughput math');
  assert.match(content, /fastestCompletion/i, 'Expected speed calculations');
});
