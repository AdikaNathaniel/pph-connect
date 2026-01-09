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

const pagePath = resolvePath('src', 'pages', 'manager', 'WorkerDetail.tsx');

test('WorkerDetail renders invoices tab', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-detail-tab-invoices"/, 'Expected invoices tab test id');
  assert.match(content, /supabase[\s\S]*\.from\('invoices'\)/, 'Expected invoices query');
});
