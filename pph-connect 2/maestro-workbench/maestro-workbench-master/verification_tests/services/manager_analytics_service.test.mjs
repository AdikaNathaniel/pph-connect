import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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

const servicePath = resolvePath('src', 'services', 'managerAnalyticsService.ts');

if (!existsSync(servicePath)) {
  throw new Error('managerAnalyticsService.ts is missing. Create it to satisfy Build Comprehensive Manager Dashboard.');
}

const content = readFileSync(servicePath, 'utf8');

test('managerAnalyticsService exports fetchManagerAnalyticsSummary', () => {
  assert.match(
    content,
    /export\s+async\s+function\s+fetchManagerAnalyticsSummary/i,
    'Expected fetchManagerAnalyticsSummary export'
  );
});

test('managerAnalyticsService queries projects, workers, work_stats, and quality_metrics', () => {
  ['projects', 'workers', 'work_stats', 'quality_metrics'].forEach((table) => {
    assert.match(
      content,
      new RegExp(`supabase[\\s\\S]+\\.from\\('${table}'\\)`),
      `Expected query for ${table}`
    );
  });
});

test('managerAnalyticsService returns summary cards and chart data', () => {
  ['summaryCards', 'chartData', 'projectProgress', 'workerDistribution', 'qualityTrend', 'taskVelocity', 'alerts'].forEach((key) => {
    assert.match(content, new RegExp(key, 'i'), `Expected ${key} field in analytics payload`);
  });
});
