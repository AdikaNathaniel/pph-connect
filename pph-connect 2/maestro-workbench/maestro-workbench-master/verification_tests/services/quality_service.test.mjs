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

const servicePath = resolvePath('src', 'services', 'qualityService.ts');

test('qualityService exports gold standard helpers', () => {
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+async\s+function\s+calculateWorkerQualityScore/i,
    /export\s+async\s+function\s+getGoldStandardAccuracy/i,
    /export\s+async\s+function\s+updateWorkerTrustRating/i,
    /export\s+async\s+function\s+getInterAnnotatorAgreementByProject/i,
    /export\s+async\s+function\s+refreshGoldStandardMetrics/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} definition`);
  });
});

test('calculateWorkerQualityScore queries quality_metrics table', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /supabase[\s\S]+\.from\('quality_metrics'\)[\s\S]+select\(/i,
    'Expected quality metrics select'
  );
  assert.match(
    content,
    /metric_type/i,
    'Expected metric_type field usage'
  );
});

test('getGoldStandardAccuracy calls calculate_gold_standard_accuracy RPC', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /supabase\.rpc\('calculate_gold_standard_accuracy'/i,
    'Expected calculate_gold_standard_accuracy RPC call'
  );
});

test('updateWorkerTrustRating calls update_worker_trust_rating RPC', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /supabase\.rpc\('update_worker_trust_rating'/i,
    'Expected update_worker_trust_rating RPC call'
  );
});

test('getInterAnnotatorAgreementByProject reads iaa metrics', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /supabase[\s\S]+\.from\('quality_metrics'\)[\s\S]+eq\('metric_type',\s*'iaa'\)/i,
    'Expected iaa metric query'
  );
});

test('refreshGoldStandardMetrics orchestrates accuracy + trust updates', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /await\s+Promise\.all\(\s*\[\s*getGoldStandardAccuracy/i,
    'Expected helper to call getGoldStandardAccuracy'
  );
  assert.match(
    content,
    /updateWorkerTrustRating/i,
    'Expected helper to call updateWorkerTrustRating'
  );
});
