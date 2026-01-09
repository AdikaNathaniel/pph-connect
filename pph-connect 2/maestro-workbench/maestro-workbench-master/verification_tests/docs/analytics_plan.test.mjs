import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'analytics_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'analytics_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Tool Selection',
  '## Events & Page Views',
  '## Privacy & Consent',
  '## Verification',
];

test('Analytics plan documents tool, events, privacy, and verification', () => {
  assert.ok(existsSync(docPath), 'Expected analytics_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['Google Analytics', 'Plausible'].forEach((tool) => {
    assert.match(content, new RegExp(tool, 'i'), `Expected mention of ${tool}`);
  });

  ['page views', 'button clicks', 'form submissions'].forEach((metric) => {
    assert.match(content, new RegExp(metric, 'i'), `Expected mention of ${metric}`);
  });

  assert.match(content, /GDPR/i, 'Expected privacy reference');
});
