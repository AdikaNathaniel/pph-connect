import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const formPath = path.join(
  process.cwd(),
  'src',
  'components',
  'training',
  'TrainingGateForm.tsx'
);

test('TrainingGateForm component exists with required fields', () => {
  assert.ok(existsSync(formPath), 'Expected TrainingGateForm.tsx to exist');
  const content = readFileSync(formPath, 'utf8');

  assert.match(content, /Label\s+htmlFor="worker"/i, 'Expected worker select label');
  assert.match(content, /Label\s+htmlFor="project"/i, 'Expected project select label');
  assert.match(content, /Label\s+htmlFor="gateName"/i, 'Expected gate name field');
  assert.match(content, /STATUS_OPTIONS/i, 'Expected status options definition');
  assert.match(content, /supabase\s*\.\s*from\('training_gates'\)/i, 'Expected training_gates insert call');
});
