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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'manager', 'QualityDashboard.tsx');

const expectConstArray = (content, name, message) => {
  const pattern = new RegExp(`const\\s+${name}\\s*(?::[^=]+)?=\\s*\\[`);
  assert.match(content, pattern, message);
};

test('QualityDashboard exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected QualityDashboard.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+QualityDashboard\b/, 'Expected named QualityDashboard export');
  assert.match(content, /export\s+default\s+QualityDashboard\b/, 'Expected default QualityDashboard export');
});

test('App mounts QualityDashboard for /m/quality', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+QualityDashboard\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\("\.\/pages\/manager\/QualityDashboard"\)\s*\);/,
    'Expected QualityDashboard lazy import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/quality"\s+element=\{\s*<ProtectedRoute[^>]+>\s*<ManagerLayout[^>]+pageTitle="Quality Overview"[^>]*>\s*<QualityDashboard\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/quality route to render QualityDashboard inside ManagerLayout'
  );
});

test('QualityDashboard renders real-time metrics and chart placeholders', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /import\s*\{\s*calculateWorkerQualityScore\s*,\s*getGoldStandardAccuracy\s*,\s*getInterAnnotatorAgreementByProject\s*,\s*updateWorkerTrustRating,?\s*\}\s*from\s+'@\/services\/qualityService';/,
    'Expected QualityDashboard to leverage quality service helpers'
  );
  [
    'data-testid="quality-dashboard"',
    'data-testid="quality-metrics-grid"',
    'data-testid="quality-trend-chart"',
    'data-testid="quality-distribution-chart"',
    'data-testid="quality-project-compare-chart"',
    'data-testid="quality-trust-table"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} element`);
  });
  assert.match(
    content,
    /data-testid=\{metric\.testId\}/,
    'Expected metric cards to forward test identifiers'
  );
  ['quality-overall-score', 'quality-pass-rate', 'quality-iaa', 'quality-trust-ratings'].forEach((metricId) => {
    assert.match(
      content,
      new RegExp(`testId:\\s*'${metricId}'`),
      `Expected Summary metric test id for ${metricId}`
    );
  });
  expectConstArray(content, 'QUALITY_SUMMARY', 'Expected QUALITY_SUMMARY constant');
  expectConstArray(content, 'QUALITY_TRENDS', 'Expected QUALITY_TRENDS constant');
  expectConstArray(content, 'PROJECT_QUALITY', 'Expected PROJECT_QUALITY constant');
});
