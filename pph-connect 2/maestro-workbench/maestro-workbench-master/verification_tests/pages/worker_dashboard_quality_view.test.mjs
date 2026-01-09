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
  return match ?? candidates[0];
};

const componentPath = resolvePath('src', 'components', 'worker', 'WorkerQualitySummary.tsx');
const dashboardPath = resolvePath('src', 'pages', 'worker', 'Dashboard.tsx');

test('WorkerQualitySummary exports component contract', () => {
  assert.ok(existsSync(componentPath), 'Expected WorkerQualitySummary.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerQualitySummary\b/, 'Expected named WorkerQualitySummary export');
  assert.match(content, /export\s+default\s+WorkerQualitySummary\b/, 'Expected default WorkerQualitySummary export');
  assert.match(
    content,
    /data-testid="worker-quality-summary"/,
    'Expected worker quality summary root test id'
  );
  [
    'data-testid="worker-quality-overall"',
    'data-testid="worker-quality-gold"',
    'data-testid="worker-quality-percentile"',
    'data-testid="worker-quality-trend"',
    'data-testid="worker-quality-insights"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} element`);
  });
});

test('WorkerQualitySummary relies on quality service RPC helpers', () => {
  const content = readFileSync(componentPath, 'utf8');
  assert.match(
    content,
    /import\s*\{\s*calculateWorkerQualityScore\s*,\s*getGoldStandardAccuracy\s*,\s*updateWorkerTrustRating,?\s*\}\s*from\s+'@\/services\/qualityService';/,
    'Expected component to import quality service helpers'
  );
});

test('WorkerDashboard renders WorkerQualitySummary', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /import\s+WorkerQualitySummary\s+from\s+'@\/components\/worker\/WorkerQualitySummary';/,
    'Expected WorkerDashboard to import WorkerQualitySummary'
  );
  assert.match(
    content,
    /<WorkerQualitySummary\s+workerId=\{user\.id\}(?:[^>]*?)\/>/,
    'Expected WorkerQualitySummary rendered with worker id prop'
  );
});
