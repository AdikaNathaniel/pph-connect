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

const servicePath = resolvePath('src', 'services', 'reportsService.ts');

if (!existsSync(servicePath)) {
  throw new Error('reportsService.ts missing. Needed for custom reports.');
}

const content = readFileSync(servicePath, 'utf8');

test('reportsService exports generators and helpers', () => {
  ['generateManagerReport', 'getAvailableMetrics', 'exportReportAsCsv'].forEach((fn) => {
    assert.match(content, new RegExp(`export\\s+async\\s+function\\s+${fn}`), `Expected ${fn} export`);
  });
  assert.match(content, /export\s+type\s+ReportResult/i, 'Expected ReportResult type');
});

test('reportsService queries Supabase sources for work stats and quality metrics', () => {
  ['work_stats', 'quality_metrics', 'projects', 'workers'].forEach((table) => {
    assert.match(
      content,
      new RegExp(`supabase[\\s\\S]+\\.from\\('${table}'\\)`),
      `Expected query for ${table}`
    );
  });
});

test('ReportResult includes rows, chart data, and metadata', () => {
  ['rows', 'columns', 'chart', 'summary', 'filters', 'metadata'].forEach((key) => {
    assert.match(content, new RegExp(key, 'i'), `Expected ${key} in report result payload`);
  });
});
