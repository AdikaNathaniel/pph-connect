import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'send-message.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'send-message.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Send message Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/send-message.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]Send message/, 'Expected describe block for send message flow');
});

test('Send message spec selects recipient and verifies toast', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['label\\[for\\^="recipient-', 'Subject \\*', 'Send Message', 'Message sent successfully', "getByRole\\(\\s*'tab'\\s*,\\s*\\{\\s*name:\\s*\/sent"].forEach((pattern) => {
    assert.match(content, new RegExp(pattern), `Expected pattern ${pattern}`);
  });
});
