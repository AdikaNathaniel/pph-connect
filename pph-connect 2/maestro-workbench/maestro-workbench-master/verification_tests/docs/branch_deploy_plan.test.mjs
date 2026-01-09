import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'branch_deploy_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'branch_deploy_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Branch Mapping',
  '## Deployment Rules',
  '## Notifications & Preview URLs',
];

test('Branch deployment plan defines mappings, rules, and notifications', () => {
  assert.ok(existsSync(docPath), 'Expected branch_deploy_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['main', 'develop', 'feature/*'].forEach((branch) => {
    assert.match(content, new RegExp(branch.replace('*', '\\*')), `Expected mention of ${branch}`);
  });

  assert.match(content, /automatic deployments/i, 'Expected auto deployment mention');
  assert.match(content, /Slack|email/i, 'Expected notification channel');
});
