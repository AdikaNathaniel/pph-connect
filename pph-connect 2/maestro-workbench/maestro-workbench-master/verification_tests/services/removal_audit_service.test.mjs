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

const servicePath = resolvePath('src', 'services', 'removalAuditService.ts');
const content = readFileSync(servicePath, 'utf8');

test('removalAuditService exports audit + metrics helpers', () => {
  [
    /export\s+interface\s+RemovalAuditEntry/i,
    /export\s+(?:interface|type)\s+RemovalMetricSummary/i,
    /export\s+async\s+function\s+fetchRemovalAudits/i,
    /export\s+async\s+function\s+fetchRemovalMetrics/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} in removal audit service`);
  });
});

test('removalAuditService queries auto_removals and computes rates', () => {
  assert.match(content, /supabase[\s\S]+\.from\('auto_removals'\)/i, 'Expected auto_removals query');
  assert.match(content, /appeal_status/i, 'Expected usage of appeal status');
  assert.match(content, /removalRate/i, 'Expected removal rate calculation');
  assert.match(content, /appealRate/i, 'Expected appeal rate calculation');
  assert.match(content, /reinstatementRate/i, 'Expected reinstatement rate calculation');
});
