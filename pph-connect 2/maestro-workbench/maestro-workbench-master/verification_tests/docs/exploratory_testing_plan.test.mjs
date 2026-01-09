import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'exploratory_testing_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'exploratory_testing_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

const REQUIRED_SECTIONS = [
  '## Edge Case Scenarios',
  '## Browser Compatibility',
  '## Mobile Responsiveness',
  '## Accessibility Checklist',
  '## Findings Log',
];

test('Exploratory testing plan covers edge cases, browsers, mobile, accessibility, and findings', () => {
  assert.ok(existsSync(docPath), 'Expected exploratory_testing_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    assert.match(content, new RegExp(section), `Expected section ${section}`);
  });

  ['Chrome', 'Firefox', 'Safari', 'Edge'].forEach((browser) => {
    assert.match(content, new RegExp(browser), `Expected browser ${browser}`);
  });

  ['desktop', 'tablet', 'mobile'].forEach((view) => {
    assert.match(content, new RegExp(view, 'i'), `Expected mention of ${view} viewport`);
  });

  assert.match(content, /screen reader/i, 'Expected accessibility mention');
  assert.match(content, /keyboard navigation/i, 'Expected keyboard navigation mention');
});
