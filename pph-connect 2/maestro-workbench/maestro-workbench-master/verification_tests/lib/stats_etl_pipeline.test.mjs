import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((entry) => existsSync(entry));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const etlPath = resolvePath('src', 'lib', 'stats', 'etl.ts');
const etlContent = readFileSync(etlPath, 'utf8');

test('stats ETL exports runStatsImport pipeline', () => {
  assert.match(etlContent, /export\s+const\s+runStatsImport/, 'Expected runStatsImport export');
  assert.match(etlContent, /export\s+interface\s+StatsImportOptions/, 'Expected options interface');
});

test('stats ETL parses CSV data', () => {
  assert.match(etlContent, /parseStatsCsv/, 'Expected CSV parser helper');
});

test('stats ETL looks up worker and project identifiers', () => {
  assert.match(etlContent, /fetchWorkerAccounts/, 'Expected worker lookup helper');
  assert.match(etlContent, /fetchProjects/, 'Expected project lookup helper');
});

test('stats ETL maps locale codes via locale_mappings', () => {
  assert.match(etlContent, /fetchLocaleMappings/, 'Expected locale mappings helper');
  assert.match(etlContent, /mapLocaleCode/, 'Expected locale mapping function');
});

test('stats ETL calculates earnings using rates_payable', () => {
  assert.match(etlContent, /fetchRatesPayable/, 'Expected rates lookup helper');
  assert.match(etlContent, /calculateEarnings/, 'Expected earnings calculation function');
});

test('stats ETL batches inserts into work_stats', () => {
  assert.match(etlContent, /batchInsertWorkStats/, 'Expected batch insert helper');
  assert.match(etlContent, /supabase\.from\('work_stats'\)\.insert/, 'Expected work_stats insert usage');
});
