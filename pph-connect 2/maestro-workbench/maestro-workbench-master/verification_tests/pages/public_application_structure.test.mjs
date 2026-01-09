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

const pagePath = resolvePath('src', 'pages', 'PublicApplicationPage.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('Public application page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+PublicApplicationPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+PublicApplicationPage\b/, 'Expected default export');
});

test('Public application page renders required form fields and captcha notice', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="public-application-page"',
    'data-testid="public-application-form"',
    'Full Name',
    'Email',
    'Country of Residence',
    'Primary Language/Locale',
    'All Languages',
    'Educational Background',
    'Domains of Expertise',
    'Resume/CV upload',
    'Cover letter',
    'How did you hear about us?',
    'data-testid="public-application-captcha"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Expected ${token}`);
  });
  assert.match(content, /reCAPTCHA|spam/i, 'Expected spam prevention messaging');
  assert.match(content, /submitPublicApplication/, 'Expected submission helper usage');
});

test('App exposes /apply public route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+PublicApplicationPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/PublicApplicationPage"\)\)/,
    'Expected lazy import for PublicApplicationPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/apply"\s+element=\{<PublicApplicationPage\s*\/>\}/,
    'Expected public /apply route'
  );
});
