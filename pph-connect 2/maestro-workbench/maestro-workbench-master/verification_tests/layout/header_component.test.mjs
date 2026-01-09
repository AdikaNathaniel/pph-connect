import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'layout', 'Header.tsx'),
  path.join(process.cwd(), 'src', 'components', 'layout', 'Header.tsx')
];

const headerPath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate Header.tsx');
  }
  return match;
})();

const content = readFileSync(headerPath, 'utf8');

test('Header exports default component', () => {
  assert.match(content, /export\s+default\s+Header/, 'Expected default Header export');
});

test('Header derives and renders the current user email', () => {
  assert.match(content, /const\s+userEmail\s*=\s*/, 'Expected computed userEmail variable');
  assert.match(content, /\.email/, 'Expected email access from user or session');
  assert.match(content, /\{userEmail\}/, 'Expected userEmail rendered in JSX');
});

test('Header exposes role badge helpers and accessible label', () => {
  assert.match(content, /const\s+roleLabel\s*=\s*/, 'Expected roleLabel computation');
  assert.match(content, /\{roleLabel\}/, 'Expected roleLabel rendered inside JSX');
  assert.match(
    content,
    /Badge[^]+variant=/,
    'Expected Badge component variant usage for role styling'
  );
});

test('Header wraps logout in a confirmation dialog', () => {
  assert.match(content, /AlertDialog/, 'Expected AlertDialog components for confirmation');
  assert.match(content, /AlertDialogTrigger/, 'Expected AlertDialogTrigger usage');
  assert.match(content, /AlertDialogAction/, 'Expected AlertDialogAction usage');
  assert.match(content, /onConfirmLogout|handleConfirmLogout|logout\(\)/, 'Expected logout invoked on confirm');
});

test('Header includes notifications affordance and compact styling', () => {
  assert.match(content, /Bell/, 'Expected Bell icon import for notifications');
  assert.match(
    content,
    /sr-only\">View notifications</,
    'Expected accessible label for notifications button'
  );
  assert.match(
    content,
    /className=\"flex items-center justify-between/,
    'Expected responsive flex layout classes on header element'
  );
});
