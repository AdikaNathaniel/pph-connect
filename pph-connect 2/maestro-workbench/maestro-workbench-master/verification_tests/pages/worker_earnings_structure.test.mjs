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
const pagePath = resolvePath('src', 'pages', 'worker', 'Earnings.tsx');

test('WorkerEarnings page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerEarnings page to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerEarningsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerEarningsPage\b/, 'Expected default export');
});

test('App mounts worker earnings routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Earnings"\)\)/,
    'Expected lazy import for WorkerEarnings page'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/earnings"[\s\S]+WorkerEarningsPage[\s\S]+\/>/,
    'Expected /w/earnings route'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/earnings"[\s\S]+WorkerEarningsPage[\s\S]+\/>/,
    'Expected /worker/earnings alias'
  );
});

test('WorkerEarnings page renders summary, breakdown, and history sections', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-earnings-header"',
    'data-testid="worker-earnings-summary"',
    'data-testid="worker-earnings-breakdown"',
    'data-testid="worker-earnings-history"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /handleRefreshEarnings/, 'Expected refresh handler');
  assert.match(content, /useEffect\(/, 'Expected effect to load earnings');
});

test('WorkerEarnings page uses balance service and work stats query', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /import\s+\{\s*useAuth\s*\}\s+from\s+'@\/contexts\/AuthContext';/, 'Expected useAuth import');
  assert.match(content, /from\s+'@\/services\/balanceService';/, 'Expected balance service import');
  assert.match(content, /calculateWorkerBalance\(/, 'Expected calculateWorkerBalance usage');
  assert.match(content, /getBalanceBreakdown\(/, 'Expected getBalanceBreakdown usage');
  assert.match(content, /supabase[\s\S]*\.from\('work_stats'\)/, 'Expected work_stats query for history');
});
