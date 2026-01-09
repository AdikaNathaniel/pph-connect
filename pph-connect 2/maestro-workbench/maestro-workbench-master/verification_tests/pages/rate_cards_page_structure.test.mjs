import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const rateCardsPagePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'RateCardsPage.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'RateCardsPage.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate RateCardsPage.tsx');
  }
  return match;
})();

const content = readFileSync(rateCardsPagePath, 'utf8');

test('RateCardsPage exports component and default', () => {
  assert.match(content, /export\s+const\s+RateCardsPage/, 'Expected named export');
  assert.match(content, /export\s+default\s+RateCardsPage/, 'Expected default export');
});

test('RateCardsPage renders actions and data table', () => {
  assert.match(content, /data-testid="rate-cards-page"/, 'Expected page test id');
  assert.match(content, /Add Rate Card/, 'Expected add action label');
  assert.match(content, /data-testid="rate-cards-table"/, 'Expected table test id');
  assert.match(content, /Locale/, 'Expected locale column header');
  assert.match(content, /Expert Tier/, 'Expected tier column header');
  assert.match(content, /Rate per Unit/, 'Expected rate per unit column header');
  assert.match(content, /Rate per Hour/, 'Expected rate per hour column header');
  assert.match(content, /Actions/, 'Expected actions column header');
});
