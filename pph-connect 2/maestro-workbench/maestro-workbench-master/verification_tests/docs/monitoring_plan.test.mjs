import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'monitoring_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'monitoring_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Error Tracking',
  '## Application Monitoring',
  '## Database Monitoring',
  '## Alerts & Notifications',
];

test('Monitoring plan covers error tracking, app/db monitoring, and alerts', () => {
  assert.ok(existsSync(docPath), 'Expected monitoring_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['Sentry', 'Supabase usage', 'Amplify metrics'].forEach((keyword) => {
    assert.match(content, new RegExp(keyword, 'i'), `Expected mention of ${keyword}`);
  });

  assert.match(content, /Slack|email/i, 'Expected alert channel reference');
});
