import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'large_dataset_testing.md'),
    path.join(process.cwd(), 'Reference Docs', 'large_dataset_testing.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Large dataset testing doc covers seeding scale targets', () => {
  assert.ok(existsSync(docPath), 'Expected large_dataset_testing.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Large Dataset Seeding/, 'Missing seeding section');
  assert.match(content, /1000\s+workers/i, 'Expected 1000 workers to be mentioned');
  assert.match(content, /100\s+projects/i, 'Expected 100 projects to be mentioned');
  assert.match(content, /seed/i, 'Expected seeding process description');
});

test('Large dataset testing doc captures page load measurements', () => {
  assert.ok(existsSync(docPath), 'Expected large_dataset_testing.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Page Load Measurements/, 'Missing page load section');
  assert.match(content, /Worker Dashboard/i, 'Expected Worker Dashboard row');
  assert.match(content, /Workers Table/i, 'Expected Workers Table row');
  assert.match(content, /FCP/i, 'Expected First Contentful Paint metric');
  assert.match(content, /TTFB/i, 'Expected Time To First Byte metric');
});

test('Large dataset testing doc summarizes query performance findings', () => {
  assert.ok(existsSync(docPath), 'Expected large_dataset_testing.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Query Performance/, 'Missing query performance section');
  assert.match(content, /EXPLAIN ANALYZE/i, 'Expected EXPLAIN ANALYZE reference');
  assert.match(content, /work_stats/i, 'Expected work_stats query mention');
  assert.match(content, /\d+(\.\d+)?\s?ms/i, 'Expected duration measurement');
});

test('Large dataset testing doc calls out bottlenecks and mitigations', () => {
  assert.ok(existsSync(docPath), 'Expected large_dataset_testing.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Bottlenecks/i, 'Missing bottlenecks section');
  assert.match(content, /virtualiz/i, 'Expected virtualization mitigation');
  assert.match(content, /index/i, 'Expected database-side mitigation');
});

test('Large dataset testing doc records implemented optimizations', () => {
  assert.ok(existsSync(docPath), 'Expected large_dataset_testing.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /idx_work_stats_recent/i, 'Expected mention of new work_stats index');
  assert.match(content, /worker_daily_stats/i, 'Expected mention of worker_daily_stats view');
  assert.match(content, /cache/i, 'Expected caching strategy documentation');
});
