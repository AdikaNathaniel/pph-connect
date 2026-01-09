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

const servicePath = resolvePath('src', 'services', 'achievementTrackingService.ts');

test('achievementTrackingService exports tracking helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected achievementTrackingService to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+checkWorkerAchievements/i, 'Expected checkWorkerAchievements export');
  assert.match(content, /supabase[\s\S]*\.from\('achievements'\)/i, 'Expected achievements query');
  assert.match(content, /supabase[\s\S]*\.from\('worker_achievements'\)/i, 'Expected worker_achievements insert');
});

test('achievementTrackingService returns newly earned achievement names for notifications', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /export\s+async\s+function\s+checkWorkerAchievements\([^)]*\):\s*Promise<\s*string\[\]\s*>/i,
    'Expected checkWorkerAchievements to return Promise<string[]>'
  );
  assert.match(
    content,
    /return\s+newlyEarned\.map\(/i,
    'Expected newly earned achievement names to be returned to callers'
  );
});

test('achievementTrackingService exposes worker achievement progress helper', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+interface\s+WorkerAchievementProgress/i, 'Expected WorkerAchievementProgress interface');
  assert.match(
    content,
    /export\s+async\s+function\s+getWorkerAchievementProgress\(/i,
    'Expected getWorkerAchievementProgress export'
  );
  ['progressPercent', 'progressLabel', 'earnedAt'].forEach((keyword) => {
    assert.match(
      content,
      new RegExp(keyword, 'i'),
      `Expected ${keyword} in achievement progress payload`
    );
  });
});
