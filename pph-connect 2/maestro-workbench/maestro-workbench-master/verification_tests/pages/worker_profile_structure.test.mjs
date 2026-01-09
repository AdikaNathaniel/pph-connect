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
const pagePath = resolvePath('src', 'pages', 'worker', 'Profile.tsx');

test('WorkerProfile page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerProfile page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerProfilePage\b/, 'Expected named WorkerProfilePage export');
  assert.match(content, /export\s+default\s+WorkerProfilePage\b/, 'Expected default WorkerProfilePage export');
});

test('App mounts worker profile routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Profile"\)\)/,
    'Expected lazy import for WorkerProfile page'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/profile"[\s\S]+WorkerProfilePage[\s\S]+\/>/,
    'Expected \/worker\/profile route'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/profile"[\s\S]+WorkerProfilePage[\s\S]+\/>/,
    'Expected \/w\/profile route'
  );
});

test('WorkerProfile page renders info, contact, accounts, and earnings sections', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-profile-info"',
    'data-testid="worker-profile-contact"',
    'data-testid="worker-profile-accounts"',
    'data-testid="worker-profile-earnings"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
});

test('WorkerProfile page hooks auth, supabase, and balance service', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /import\s+\{\s*useAuth\s*\}\s+from\s+'@\/contexts\/AuthContext';/, 'Expected useAuth import');
  assert.match(content, /from\s+'@\/services\/balanceService';/, 'Expected balance service import');
  assert.match(content, /supabase[\s\S]*\.from\('worker_accounts'\)/, 'Expected worker_accounts query');
  assert.match(content, /useEffect\(/, 'Expected effect to fetch data');
});

test('WorkerProfile page exposes achievements tab and list container', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-profile-tabs"/, 'Expected profile tabs container');
  assert.match(content, /value="overview"/i, 'Expected overview tab trigger');
  assert.match(content, /value="achievements"/i, 'Expected achievements tab trigger');
  assert.match(content, /data-testid="worker-profile-achievements"/, 'Expected achievements tab content');
  assert.match(content, /data-testid="worker-achievement-card"/, 'Expected achievement cards');
});

test('WorkerProfile achievements tab fetches progress data', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /from\s+'@\/services\/achievementTrackingService';/, 'Expected achievement tracking import');
  assert.match(content, /getWorkerAchievementProgress/i, 'Expected progress fetch helper usage');
  assert.match(content, /setAchievements/i, 'Expected achievements state management');
});
