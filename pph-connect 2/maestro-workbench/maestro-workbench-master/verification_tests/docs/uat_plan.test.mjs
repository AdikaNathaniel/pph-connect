import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'uat_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'uat_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

const REQUIRED_SECTIONS = [
  '## Participant Invitations',
  '## UAT Environment',
  '## Test Agenda',
  '## Feedback Collection',
  '## Prioritization & Handoff',
];

test('UAT plan exists with participant, environment, agenda, feedback, and prioritization details', () => {
  assert.ok(existsSync(docPath), 'Expected uat_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });

  ['admins', 'managers', 'workers'].forEach((role) => {
    assert.match(content, new RegExp(role, 'i'), `Expected mention of ${role}`);
  });

  assert.match(content, /staging/i, 'Expected staging environment reference');
  assert.match(content, /feedback/i, 'Expected feedback instructions');
  assert.match(content, /prioritize/i, 'Expected prioritization guidance');
});
