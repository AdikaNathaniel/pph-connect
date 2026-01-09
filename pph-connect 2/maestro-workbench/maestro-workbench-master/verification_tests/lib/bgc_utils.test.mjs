import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

const resolveModule = (...segments) => {
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

const modulePath = resolveModule('src', 'lib', 'utils', 'bgc.ts');

const loadModule = async () => {
  const specifier = `${modulePath}?${Date.now()}`;
  return import(specifier);
};

const withFixedNow = async (isoTimestamp, fn) => {
  const originalNow = Date.now;
  try {
    const fixed = new Date(isoTimestamp).getTime();
    Date.now = () => fixed;
    await fn();
  } finally {
    Date.now = originalNow;
  }
};

test('BGC utilities expose expected helpers', async () => {
  const mod = await loadModule();
  ['getBGCStatus', 'getDaysUntilExpiration', 'formatBGCWarning'].forEach((fnName) => {
    assert.equal(typeof mod[fnName], 'function', `Expected ${fnName} export to be a function`);
  });
});

test('getDaysUntilExpiration returns positive, zero, and negative day counts', async () => {
  await withFixedNow('2025-01-01T00:00:00Z', async () => {
    const { getDaysUntilExpiration } = await loadModule();
    assert.equal(getDaysUntilExpiration('2025-02-10'), 40, 'Expected 40 days until Feb 10');
    assert.equal(getDaysUntilExpiration('2025-01-01'), 0, 'Expected 0 days on same date');
    assert.equal(getDaysUntilExpiration('2024-12-22'), -10, 'Expected negative days for past date');
  });
});

test('getBGCStatus categorises expiration into valid, expiring, and expired', async () => {
  await withFixedNow('2025-01-01T00:00:00Z', async () => {
    const { getBGCStatus } = await loadModule();
    assert.equal(getBGCStatus('2025-03-01'), 'valid', 'Expected far future date to be valid');
    assert.equal(getBGCStatus('2025-01-20'), 'expiring', 'Expected near-term date to be expiring');
    assert.equal(getBGCStatus('2024-12-15'), 'expired', 'Expected past date to be expired');
    assert.equal(getBGCStatus(undefined), 'valid', 'Expected undefined expiration to default to valid');
  });
});

test('formatBGCWarning provides human-friendly messaging', async () => {
  await withFixedNow('2025-01-01T00:00:00Z', async () => {
    const { formatBGCWarning } = await loadModule();
    assert.equal(
      formatBGCWarning('2025-03-01'),
      'Background check valid until Mar 1, 2025',
      'Expected formatted future tooltip'
    );
    assert.equal(
      formatBGCWarning('2025-01-15'),
      'Background check expires in 14 days',
      'Expected expiring warning'
    );
    assert.equal(
      formatBGCWarning('2024-12-20'),
      'Background check expired 12 days ago',
      'Expected expired warning message'
    );
    assert.equal(
      formatBGCWarning(undefined),
      'Background check status unavailable',
      'Expected fallback message for missing date'
    );
  });
});
