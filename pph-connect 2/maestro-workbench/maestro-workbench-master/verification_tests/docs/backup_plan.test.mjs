import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'backup_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'backup_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Automated Backups',
  '## Restoration Test',
  '## Disaster Recovery',
];

test('Backup plan documents backups, restoration, and DR steps', () => {
  assert.ok(existsSync(docPath), 'Expected backup_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  assert.match(content, /daily/i, 'Expected backup frequency mention');
  assert.match(content, /retention/i, 'Expected retention mention');
  assert.match(content, /Supabase/i, 'Expected Supabase reference');
  assert.match(content, /contact/i, 'Expected contact info reference');
});
