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

const servicePath = resolvePath('src', 'services', 'taskUnlockService.ts');

test('taskUnlockService exports unlocking helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected taskUnlockService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+(?:async\s+function|const)\s+getUnlockedDifficulties/i,
    /export\s+(?:async\s+function|const)\s+checkUnlockCriteria/i,
    /export\s+(?:async\s+function|const)\s+unlockDifficulty/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected pattern ${pattern}`);
  });
  assert.match(content, /supabase[\s\S]*\.from\('work_stats'\)/i, 'Expected work_stats query');
  assert.match(content, /supabase[\s\S]*\.from\('worker_unlocks'\)/i, 'Expected worker_unlocks persistence');
});

test('taskUnlockService provides unlock progress summary helper', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+interface\s+UnlockProgress/i, 'Expected UnlockProgress interface');
  assert.match(content, /export\s+(?:async\s+function|const)\s+getUnlockProgress/i, 'Expected getUnlockProgress export');
  ['completionPercent', 'remainingTasks', 'nextLevel', 'unlockedLevels'].forEach((keyword) => {
    assert.match(content, new RegExp(keyword, 'i'), `Expected ${keyword} in unlock progress payload`);
  });
  assert.match(
    content,
    /COMPLETION_THRESHOLDS[\s\S]+QUALITY_SCORE_REQUIREMENTS/i,
    'Expected progress helper to reference thresholds'
  );
});
