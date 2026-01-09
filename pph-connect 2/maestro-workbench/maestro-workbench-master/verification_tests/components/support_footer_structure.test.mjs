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

const footerPath = resolvePath('src', 'components', 'support', 'SupportFooter.tsx');
const managerLayoutPath = resolvePath('src', 'components', 'layout', 'ManagerLayout.tsx');
const mainLayoutPath = resolvePath('src', 'components', 'layout', 'MainLayout.tsx');

test('SupportFooter component exposes required support links', () => {
  const content = readFileSync(footerPath, 'utf8');
  assert.match(content, /data-testid="support-footer"/, 'Expected footer data-testid');
  [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Support', href: '/support/tickets' },
    { label: 'Report Issue', href: '/report' }
  ].forEach(({ label, href }) => {
    assert.match(content, new RegExp(label), `Expected label ${label}`);
    assert.match(content, new RegExp(href.replace('/', '\\/')), `Expected link ${href}`);
  });
});

test('ManagerLayout and MainLayout include SupportFooter', () => {
  const managerLayout = readFileSync(managerLayoutPath, 'utf8');
  const mainLayout = readFileSync(mainLayoutPath, 'utf8');

  [managerLayout, mainLayout].forEach((content, idx) => {
    assert.match(content, /SupportFooter/, `Expected SupportFooter import/usage for layout ${idx + 1}`);
    assert.match(content, /<SupportFooter\s*\/>/, `Expected SupportFooter rendered for layout ${idx + 1}`);
  });
});
