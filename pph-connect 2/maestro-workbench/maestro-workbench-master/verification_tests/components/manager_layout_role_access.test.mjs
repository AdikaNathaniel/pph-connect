import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const layoutPath = resolvePath('src', 'components', 'layout', 'ManagerLayout.tsx');

test('ManagerLayout gates navigation and quick actions by role and surfaces header badge', () => {
  const content = readFileSync(layoutPath, 'utf8');
  assert.match(
    content,
    /import\s+\{\s*hasRole(?:\s*,\s*type\s+\w+)?\s*\}\s+from\s+'@\/lib\/auth\/roles';/,
    'Expected hasRole import in ManagerLayout'
  );
  assert.match(
    content,
    /minRole\?\s*:\s*UserRole/,
    'Expected navigation items to declare a minimum role'
  );
  assert.match(
    content,
    /filteredNavigation[\s\S]+hasRole/,
    'Expected ManagerLayout to filter navigation entries using hasRole'
  );
  assert.match(
    content,
    /const\s+quickCreateActions[\s\S]+minRole\s*:/,
    'Expected quick create actions to declare minimum roles'
  );
  assert.match(
    content,
    /allowedQuickCreateActions[\s\S]+hasRole/,
    'Expected quick create actions to be filtered using hasRole'
  );
  assert.match(
    content,
    /data-testid="manager-layout-header-role-badge"/,
    'Expected role badge test id for header badge'
  );
});
