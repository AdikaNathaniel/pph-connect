import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'error_tracking_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'error_tracking_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Tool Integration',
  '## Frontend Errors',
  '## Edge Function Errors',
  '## Alerting & Triage',
];

test('Error tracking plan documents tooling, coverage, and alerts', () => {
  assert.ok(existsSync(docPath), 'Expected error_tracking_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['Sentry', 'Edge Functions', 'VersionTracker'].forEach((term) => {
    assert.match(content, new RegExp(term, 'i'), `Expected mention of ${term}`);
  });

  assert.match(content, /Slack|email/i, 'Expected alert channel mention');
});
