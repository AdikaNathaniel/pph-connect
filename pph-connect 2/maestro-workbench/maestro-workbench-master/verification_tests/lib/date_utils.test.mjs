import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolveModule = (...segments) => {
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

const modulePath = resolveModule('src', 'lib', 'utils', 'date.ts');

const loadModule = async () => import(`${modulePath}?${Date.now()}`);

test('date utilities export expected helpers', async () => {
  const mod = await loadModule();
  ['formatDate', 'formatRelativeDate', 'isDateInRange'].forEach((fnName) => {
    assert.equal(typeof mod[fnName], 'function', `Expected ${fnName} to be exported`);
  });
});

test('formatDate uses date-fns tokens and handles invalid inputs', async () => {
  const { formatDate } = await loadModule();
  assert.equal(formatDate('2025-05-18', 'MMM d, yyyy'), 'May 18, 2025');
  assert.equal(formatDate(new Date('2020-01-01T12:34:56Z'), 'yyyy-MM-dd'), '2020-01-01');
  assert.equal(formatDate('not-a-date', 'MMM d, yyyy'), '', 'Expected empty string for invalid date');
});

test('formatRelativeDate describes past and future ranges', async () => {
  const { formatRelativeDate } = await loadModule();
  const now = new Date('2025-05-01T00:00:00Z');
  assert.equal(
    formatRelativeDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), now),
    '3 days ago',
    'Expected past relative formatting'
  );
  assert.equal(
    formatRelativeDate(new Date(now.getTime() + 2 * 60 * 60 * 1000), now),
    'in 2 hours',
    'Expected future relative formatting'
  );
  assert.equal(formatRelativeDate('invalid', now), '', 'Expected empty string for invalid input');
});

test('isDateInRange returns true when date is within inclusive bounds', async () => {
  const { isDateInRange } = await loadModule();
  assert.equal(
    isDateInRange('2025-05-10', '2025-05-01', '2025-05-31'),
    true,
    'Expected in-range date to return true'
  );
  assert.equal(
    isDateInRange('2025-05-01', '2025-05-01', '2025-05-31'),
    true,
    'Expected boundary date to return true'
  );
  assert.equal(
    isDateInRange('2025-04-30', '2025-05-01', '2025-05-31'),
    false,
    'Expected out-of-range date to return false'
  );
  assert.equal(
    isDateInRange('invalid', '2025-05-01', '2025-05-31'),
    false,
    'Expected invalid date to return false'
  );
});
