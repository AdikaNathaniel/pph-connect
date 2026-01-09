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

const workbenchPath = resolvePath('src', 'pages', 'worker', 'Workbench.tsx');
const dashboardPath = resolvePath('src', 'pages', 'worker', 'Dashboard.tsx');

test('Worker Workbench triggers achievement tracking when completing tasks', () => {
  const content = readFileSync(workbenchPath, 'utf8');
  assert.match(
    content,
    /from\s+['"]@\/services\/achievementTrackingService['"]/i,
    'Expected Workbench to import achievement tracking service'
  );
  assert.match(
    content,
    /handleCompleteTask[\s\S]+checkWorkerAchievements\(/i,
    'Expected handleCompleteTask to invoke checkWorkerAchievements'
  );
  assert.match(
    content,
    /toast\.success[\s\S]+achievement/i,
    'Expected Workbench to toast achievement unlock notices'
  );
});

test('Worker Dashboard checks achievements after quality refresh', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /from\s+['"]@\/services\/achievementTrackingService['"]/i,
    'Expected Dashboard to import achievement tracking service'
  );
  assert.match(
    content,
    /refreshQualityScore[\s\S]+checkWorkerAchievements\(/i,
    'Expected quality refresh to trigger achievement checks'
  );
});
