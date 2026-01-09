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

const modulePath = resolveModule('src', 'lib', 'utils', 'helpers.ts');
const loadModule = async () => import(`${modulePath}?${Date.now()}`);

test('general helpers export expected functions', async () => {
  const mod = await loadModule();
  ['cn', 'debounce', 'formatCurrency', 'truncate'].forEach((fn) => {
    assert.equal(typeof mod[fn], 'function', `Expected ${fn} export`);
  });
});

test('cn merges class names while skipping falsy values', async () => {
  const { cn } = await loadModule();
  assert.equal(
    cn('p-4', null, 'text-sm', undefined, false && 'hidden', 'bg-blue-500'),
    'p-4 text-sm bg-blue-500'
  );
});

test('debounce delays execution until wait period has elapsed', async () => {
  const { debounce } = await loadModule();
  let callCount = 0;
  const debounced = debounce(() => {
    callCount += 1;
  }, 50);

  debounced();
  debounced();
  debounced();

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(callCount, 1, 'Expected debounced function to run once');
});

test('formatCurrency formats amounts with default and custom locales', async () => {
  const { formatCurrency } = await loadModule();
  assert.equal(formatCurrency(1234.56, 'USD'), '$1,234.56');
  assert.equal(formatCurrency(1234.56, 'EUR', 'de-DE'), '1.234,56 €');
  assert.equal(formatCurrency('invalid', 'USD'), '', 'Expected empty string for invalid amount');
});

test('truncate shortens strings and appends ellipsis by default', async () => {
  const { truncate } = await loadModule();
  assert.equal(truncate('Hello world', 5), 'Hello…');
  assert.equal(truncate('Hello', 10), 'Hello', 'Expected no change when shorter than limit');
  assert.equal(truncate('Hello world', 5, ' <more>'), 'Hello <more>', 'Expected custom suffix support');
  assert.equal(truncate('', 5), '', 'Expected empty string to remain empty');
});
