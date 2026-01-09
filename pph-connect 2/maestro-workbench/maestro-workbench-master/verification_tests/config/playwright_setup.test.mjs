import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const configPath = path.join(process.cwd(), 'playwright.config.ts');
const packageJsonPath = path.join(process.cwd(), 'package.json');

const checkExists = () => {
  assert.ok(existsSync(configPath), 'Expected playwright.config.ts');
  const configContent = readFileSync(configPath, 'utf8');
  ['baseURL', 'projects', 'use: {', 'trace:'].forEach((token) => {
    assert.match(configContent, new RegExp(token), `Expected config to include ${token}`);
  });

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  assert.ok(pkg.scripts?.e2e, 'package.json missing e2e script');
};

test('playwright config and scripts exist', () => {
  checkExists();
});
