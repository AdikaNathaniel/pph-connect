import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const servicePath = path.join(process.cwd(), 'src', 'services', 'qualityService.ts');

test('Quality service exposes expected functions and RPC references', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+calculateWorkerQualityScore/i, 'Expected calculateWorkerQualityScore export');
  assert.match(content, /export\s+async\s+function\s+getGoldStandardAccuracy/i, 'Expected getGoldStandardAccuracy export');
  assert.match(content, /export\s+async\s+function\s+getInterAnnotatorAgreement/i, 'Expected getInterAnnotatorAgreement export');
  assert.match(content, /export\s+async\s+function\s+updateWorkerTrustRating/i, 'Expected updateWorkerTrustRating export');
  assert.match(content, /rpc\('calculate_gold_standard_accuracy'/i, 'Expected RPC for gold standard accuracy');
  assert.match(content, /rpc\('calculate_project_iaa'/i, 'Expected RPC for project IAA');
  assert.match(content, /rpc\('update_worker_trust_rating'/i, 'Expected RPC for trust rating');
});
