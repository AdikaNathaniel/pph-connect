import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'deployment_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'deployment_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## Amplify Setup',
  '## Build Configuration',
  '## Deployment Steps',
];

test('Deployment plan documents Amplify setup, build config, and steps', () => {
  assert.ok(existsSync(docPath), 'Expected deployment_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['Connect GitHub repository', 'npm run build', 'dist'].forEach((keyword) => {
    assert.match(content, new RegExp(keyword, 'i'), `Expected mention of ${keyword}`);
  });

  assert.match(content, /VITE_/i, 'Expected mention of Vite environment variables');
  assert.match(content, /Supabase/i, 'Expected mention of Supabase env setup');
});
