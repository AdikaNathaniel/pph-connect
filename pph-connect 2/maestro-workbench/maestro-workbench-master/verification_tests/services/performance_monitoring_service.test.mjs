import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

const logicPath = `file://${resolveModule('src/services/performanceMonitoringLogic.ts')}`;
const servicePath = resolveModule('src/services/performanceMonitoringService.ts');
const serviceContent = existsSync(servicePath) ? readFileSync(servicePath, 'utf8') : '';
const { classifyPerformance } = await import(logicPath);

test('classifyPerformance categorizes worker project metrics into zones', () => {
  const metrics = {
    accuracy: 0.96,
    rejectionRate: 0.04,
    iaa: 0.85,
    thresholds: { accuracy: 0.9, rejectionRate: 0.05, iaa: 0.8 }
  };
  const zone = classifyPerformance(metrics);
  assert.equal(zone, 'green');
});

test('classifyPerformance flags yellow when metrics are within warning buffer', () => {
  const metrics = {
    accuracy: 0.905,
    rejectionRate: 0.049,
    iaa: 0.8,
    thresholds: { accuracy: 0.9, rejectionRate: 0.05, iaa: 0.8 },
    warningBufferPercent: 0.02,
  };
  const zone = classifyPerformance(metrics);
  assert.equal(zone, 'yellow');
});

test('classifyPerformance escalates to orange/red based on consecutive days below threshold', () => {
  const belowMetrics = {
    accuracy: 0.85,
    rejectionRate: 0.08,
    thresholds: { accuracy: 0.9, rejectionRate: 0.05 },
    consecutiveDaysBelow: 7,
  };
  const orangeZone = classifyPerformance(belowMetrics);
  assert.equal(orangeZone, 'orange');

  const extendedBreach = {
    ...belowMetrics,
    consecutiveDaysBelow: 18,
  };
  const redZone = classifyPerformance(extendedBreach);
  assert.equal(redZone, 'red');
});

test('performance monitoring service exports rolling snapshot + job helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected performanceMonitoringService.ts to exist');
  assert.match(serviceContent, /export\s+interface\s+PerformanceSnapshot/i, 'Expected PerformanceSnapshot interface');
  [
    /export\s+(?:async\s+function|const)\s+collectPerformanceSnapshots/i,
    /export\s+(?:async\s+function|const)\s+runDailyPerformanceCheck/i
  ].forEach((pattern) => {
    assert.match(serviceContent, pattern, `Expected service to export helper matching ${pattern}`);
  });
  assert.match(serviceContent, /supabase[\s\S]+\.from\('quality_metrics'\)/i, 'Expected query to quality_metrics table');
  assert.match(serviceContent, /supabase[\s\S]+\.from\('performance_thresholds'\)/i, 'Expected query to performance_thresholds table');
  assert.match(serviceContent, /rolling_avg_7d/i, 'Expected rolling 7-day averages usage');
  assert.match(serviceContent, /rolling_avg_30d/i, 'Expected rolling 30-day averages usage');
  assert.match(serviceContent, /classifyPerformance/i, 'Expected service to use classifyPerformance logic');
});

test('runDailyPerformanceCheck logs violations to performance_reviews and returns summary counts', () => {
  assert.match(
    serviceContent,
    /const\s+violations\s*=\s*snapshots\.filter\(\(snapshot\)\s*=>\s*snapshot\.zone\s*!==\s*'green'\)/i,
    'Expected violations filter logic'
  );
  assert.match(serviceContent, /supabase[\s\S]+\.from\('performance_reviews'\)/i, 'Expected insert into performance_reviews');
  assert.match(
    serviceContent,
    /const\s+buildZoneBreakdown[\s\S]+snapshots\.reduce/i,
    'Expected helper to aggregate zone breakdown via snapshots.reduce'
  );
  assert.match(
    serviceContent,
    /const\s+zoneBreakdown\s*=\s*buildZoneBreakdown\(snapshots\)/i,
    'Expected runDailyPerformanceCheck to build zone breakdown'
  );
  assert.match(
    serviceContent,
    /handleProgressiveActions\(/i,
    'Expected progressive action framework integration'
  );
  assert.match(
    serviceContent,
    /return\s*\{\s*processed:\s*snapshots\.length,\s*removalsQueued:\s*violations\.length,\s*zoneBreakdown\s*\}/i,
    'Expected summary payload with processed, removalsQueued, and zoneBreakdown'
  );
});
