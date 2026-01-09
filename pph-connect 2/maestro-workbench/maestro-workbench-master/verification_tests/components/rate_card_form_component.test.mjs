import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const formPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'rate-cards', 'RateCardForm.tsx'),
    path.join(process.cwd(), 'src', 'components', 'rate-cards', 'RateCardForm.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate RateCardForm.tsx');
  }
  return match;
})();

const content = readFileSync(formPath, 'utf8');

test('RateCardForm exports component and props', () => {
  assert.match(content, /export\s+interface\s+RateCardFormProps/, 'Expected props interface');
  assert.match(content, /export\s+const\s+RateCardForm/, 'Expected named export');
  assert.match(content, /export\s+default\s+RateCardForm/, 'Expected default export');
});

test('RateCardForm renders required fields', () => {
  assert.match(content, /name="locale"/, 'Expected locale input');
  assert.match(content, /name="expertTier"/, 'Expected expert tier select');
  assert.match(content, /name="country"/, 'Expected country input');
  assert.match(content, /name="ratePerUnit"/, 'Expected rate per unit input');
  assert.match(content, /name="ratePerHour"/, 'Expected rate per hour input');
  assert.match(content, /name="currency"/, 'Expected currency input');
  assert.match(content, /name="effectiveFrom"/, 'Expected effective from input');
  assert.match(content, /name="effectiveTo"/, 'Expected effective to input');
});

test('RateCardForm enforces effective_to greater than effective_from', () => {
  assert.match(content, /if\s*\(\s*values\.effectiveTo\s*/);
  assert.match(content, /new\s+Date\(values\.effectiveTo\)\s*<=\s*new\s+Date\(values\.effectiveFrom\)/);
});

test('RateCardForm toggles create vs update mode', () => {
  assert.match(content, /mode\s*===\s*'create'/, 'Expected create mode branch');
  assert.match(content, /mode\s*===\s*'update'/, 'Expected update mode branch');
  assert.match(content, /data-testid="rate-card-form-submit"/, 'Expected submit button test id');
});
