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

const componentPath = resolvePath('src', 'components', 'project', 'ProjectListingForm.tsx');

test('ProjectListingForm exports component contract', () => {
  assert.ok(existsSync(componentPath), 'Expected ProjectListingForm.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');
  assert.match(content, /export\s+function\s+ProjectListingForm\b/, 'Expected ProjectListingForm export');
  assert.match(content, /useForm[<(]/, 'Expected react-hook-form usage');
  assert.match(content, /z\.object\(/, 'Expected zod schema');
});

test('ProjectListingForm defines required fields and submit handler', () => {
  const content = readFileSync(componentPath, 'utf8');
  [
    'Project',
    'Is Active',
    'Max Capacity',
    'Required Skills',
    'Required Locales',
    'Required Tier',
    'Description',
  ].forEach((label) => {
    assert.match(content, new RegExp(label), `Expected ${label} label`);
  });
  assert.match(content, /onSubmit/, 'Expected submit handler');
});
