import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'layout', 'Sidebar.tsx'),
  path.join(process.cwd(), 'src', 'components', 'layout', 'Sidebar.tsx')
];

const sidebarPath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate Sidebar.tsx');
  }
  return match;
})();

const content = readFileSync(sidebarPath, 'utf8');

test('Sidebar exports navigation component', () => {
  assert.match(content, /export\s+const\s+Sidebar\b/, 'Expected Sidebar export');
});

test('Sidebar defines the required navigation links', () => {
  [
    '/m/dashboard',
    '/m/workers',
    '/m/projects',
    '/m/teams',
    '/m/departments'
  ].forEach((href) => {
    assert.match(content, new RegExp(href), `Expected navigation link for ${href}`);
  });
});

test('Sidebar exposes a reusable active state helper', () => {
  assert.match(content, /const\s+isActive\s*=\s*\(/, 'Expected isActive helper declaration');
  assert.match(
    content,
    /isActive\(\s*location\.pathname\s*,\s*item\.href\s*\)/,
    'Expected isActive helper usage with current pathname'
  );
});

test('Sidebar assigns lucide icons and wraps groups in collapsible sections', () => {
  ['Home', 'Users', 'FolderOpen', 'UserCheck', 'Building2'].forEach((icon) => {
    assert.match(content, new RegExp(`\\b${icon}\\b`), `Expected ${icon} lucide icon import`);
  });

  assert.match(content, /Collapsible/, 'Expected Collapsible component usage for group toggles');
});

test('SidebarLink renders accessible navigation links', () => {
  assert.match(
    content,
    /<Link\s+to=\{item\.href\}\s+className=/,
    'Expected Link with explicit className for block-level target'
  );
  assert.match(
    content,
    /aria-current=\{active \? 'page' : undefined\}/,
    'Expected aria-current attribute tied to active state'
  );
});

test('Sidebar includes responsive collapse handling', () => {
  assert.match(content, /Sheet/i, 'Expected mobile sheet/drawer for responsiveness');
});
