import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'security_testing_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'security_testing_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_SECTIONS = [
  '## SQL Injection Verification',
  '## XSS Hardening',
  '## CSRF & Session Controls',
  '## Insecure Direct Object References',
];

test('Security testing plan lists SQLi/XSS/CSRF/IDOR coverage', () => {
  assert.ok(existsSync(docPath), 'Expected security_testing_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Missing section ${section}`);
  });

  ['worker_applications', 'project_listings', 'messages'].forEach((surface) => {
    assert.match(content, new RegExp(surface), `Expected mention of ${surface}`);
  });

  assert.match(content, /Supabase REST/, 'Expected Supabase reference');
  assert.match(content, /Playwright|automation/i, 'Expected automation reference');
});
