import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const servicePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'services', 'qualityAlertService.ts'),
    path.join(process.cwd(), 'src', 'services', 'qualityAlertService.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Unable to locate qualityAlertService.ts');
  }
  return match;
})();

const content = readFileSync(servicePath, 'utf8');

test('qualityAlertService exports helpers', () => {
  assert.match(content, /export\s+interface\s+QualityAlert/, 'Expected QualityAlert interface');
  assert.match(content, /export\s+async\s+function\s+fetchQualityAlerts/, 'Expected fetchQualityAlerts export');
  assert.match(content, /export\s+async\s+function\s+createQualityAlert/, 'Expected createQualityAlert export');
});

test('qualityAlertService queries tables and sends notifications', () => {
  assert.match(content, /from\('quality_alerts'\)/, 'Expected quality_alerts query');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/, 'Expected send-message invocation');
  assert.match(content, /getAvailableProjects|calculateWorkerQualityScore/, 'Expected dependency on quality sources');
});
