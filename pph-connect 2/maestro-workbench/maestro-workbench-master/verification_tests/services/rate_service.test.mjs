import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const servicePath = resolvePath('src', 'services', 'rateService.ts');
const serviceContent = readFileSync(servicePath, 'utf8');

test('rateService exports getRateForWorker', () => {
  assert.match(serviceContent, /export\s+const\s+getRateForWorker/, 'Expected getRateForWorker export');
});

test('rateService query selects from rates_payable with effective date filter', () => {
  assert.match(serviceContent, /from\('rates_payable'\)/, 'Expected rates_payable query');
  assert.match(serviceContent, /lte\('effective_from',\s*date\)/, 'Expected effective_from <= date condition');
  assert.match(serviceContent, /or\(\[/, 'Expected effective_to null or >= date condition');
});

test('rateService looks up worker locale via worker_accounts', () => {
  assert.match(serviceContent, /from\('worker_accounts'\)/, 'Expected worker_accounts lookup');
  assert.match(serviceContent, /worker_id/, 'Expected worker_id usage');
});

test('rateService falls back to project locale when worker locale missing', () => {
  assert.match(serviceContent, /from\('projects'\)/, 'Expected projects lookup');
  assert.match(serviceContent, /project_id/, 'Expected project_id usage');
});

test('rateService includes locale mappings fallback', () => {
  assert.match(serviceContent, /from\('locale_mappings'\)/, 'Expected locale_mappings lookup');
});

test('rateService returns structured RateQuote result', () => {
  assert.match(serviceContent, /export\s+type\s+RateQuote/, 'Expected RateQuote type export');
  assert.match(serviceContent, /return\s+{\s*rateCardId:/, 'Expected structured return object');
});
