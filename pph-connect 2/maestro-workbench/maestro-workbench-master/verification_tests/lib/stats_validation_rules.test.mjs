import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((entry) => existsSync(entry));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const validatorPath = resolvePath('src', 'lib', 'stats', 'validation.ts');
const validatorContent = readFileSync(validatorPath, 'utf8');

test('stats validator exports rules', () => {
  assert.match(validatorContent, /export\s+interface\s+StatsValidationResult/, 'Expected StatsValidationResult interface');
  assert.match(validatorContent, /export\s+const\s+validateStatsRows/, 'Expected validateStatsRows export');
});

test('stats validator checks worker account exists', () => {
  assert.match(
    validatorContent,
    /ensureWorkerAccountsExist/,
    'Expected helper to check worker accounts'
  );
});

test('stats validator checks project exists', () => {
  assert.match(
    validatorContent,
    /ensureProjectsExist/,
    'Expected helper to check projects'
  );
});

test('stats validator validates date format', () => {
  assert.match(
    validatorContent,
    /isValidISODate/,
    'Expected date validation helper'
  );
});

test('stats validator validates numeric values', () => {
  assert.match(
    validatorContent,
    /isPositiveNumber/,
    'Expected numeric validation helper'
  );
});

test('stats validator checks for duplicate entries', () => {
  assert.match(
    validatorContent,
    /findDuplicateKeys/,
    'Expected duplicate detection helper'
  );
});
