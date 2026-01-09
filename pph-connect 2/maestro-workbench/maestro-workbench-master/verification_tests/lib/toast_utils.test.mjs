import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const toastUtilsPath = resolvePath('src', 'lib', 'toast', 'index.ts');

test('toast utilities wrap sonner primitives', () => {
  assert.ok(existsSync(toastUtilsPath), 'Expected toast utilities file to exist');
  const content = readFileSync(toastUtilsPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*toast\s*\}\s+from\s+'sonner';/,
    'Expected toast utilities to re-export sonner toast instance'
  );

  ['showSuccessToast', 'showErrorToast', 'showInfoToast'].forEach((fn) => {
    assert.match(
      content,
      new RegExp(`export\\s+const\\s+${fn}\\b`),
      `Expected ${fn} helper export`
    );
  });
});

test('toast utilities accept optional description payloads', () => {
  const content = readFileSync(toastUtilsPath, 'utf8');

  assert.ok(
    content.includes('toast.error(title, description ? { description } : undefined);'),
    'Expected showErrorToast to forward description to toast.error'
  );
  assert.ok(
    content.includes('toast.success(title, description ? { description } : undefined);'),
    'Expected showSuccessToast to forward description to toast.success'
  );
});
