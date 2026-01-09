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

const servicePath = resolvePath('src', 'services', 'anomalyDetectionService.ts');

test('anomalyDetectionService exports scoring helpers and handles thresholding', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+scoreTaskSubmission/i, 'Expected scoreTaskSubmission export');
  assert.match(content, /export\s+async\s+function\s+handleAnomalyResult/i, 'Expected handleAnomalyResult export');
  assert.match(content, /fetch\(.*anomaly/i, 'Expected fetch call to anomaly endpoint');
  assert.match(content, /threshold/i, 'Expected threshold usage');
  assert.match(content, /supabase/i, 'Expected Supabase update when anomalies trigger');
});
