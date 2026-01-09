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

const servicePath = resolvePath('src', 'services', 'workerAnalyticsService.ts');
const content = readFileSync(servicePath, 'utf8');

test('workerAnalyticsService exports summary helper', () => {
  assert.match(
    content,
    /export\s+async\s+function\s+fetchWorkerAnalyticsSummary/i,
    'Expected fetchWorkerAnalyticsSummary export'
  );
});

test('workerAnalyticsService queries worker_daily_stats view and quality_metrics table', () => {
  assert.match(
    content,
    /supabase[\s\S]+\.from\('worker_daily_stats'\)[\s\S]+select\(/i,
    'Expected worker_daily_stats select'
  );
  assert.match(
    content,
    /supabase[\s\S]+\.from\('quality_metrics'\)[\s\S]+select\(/i,
    'Expected quality_metrics select'
  );
  assert.match(content, /benchmarks/i, 'Expected benchmark calculation');
});

test('workerAnalyticsService exposes summary snapshot data', () => {
  assert.match(content, /summary:\s*{[\s\S]+averageQuality/i, 'Expected summary object with quality average');
  assert.match(content, /daysTracked/i, 'Expected days tracked metric');
});

test('workerAnalyticsService caches analytics responses with TTL', () => {
  assert.match(content, /const\s+analyticsCache\s*=\s*new\s+Map/i, 'Expected in-memory analytics cache');
  assert.match(content, /CACHE_TTL_MS/i, 'Expected cache TTL constant');
  assert.match(content, /analyticsCache\.set\(/i, 'Expected cache storage after fetch');
});
