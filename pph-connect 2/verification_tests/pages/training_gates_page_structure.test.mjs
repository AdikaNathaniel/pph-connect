import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagePath = path.join(process.cwd(), 'src', 'pages', 'manager', 'TrainingGatesPage.tsx');

test('TrainingGatesPage file exists and exports component', () => {
  assert.ok(existsSync(pagePath), 'Expected TrainingGatesPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /const\s+TrainingGatesPage\s*:\s*React\.FC/i, 'Expected component definition');
  assert.match(content, /export\s+default\s+TrainingGatesPage/i, 'Expected default export');
});

test('TrainingGatesPage fetches gates, workers, and projects', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /supabase\s*\.\s*from\('training_gates'\)/i, 'Expected training_gates query');
  assert.match(content, /supabase\s*\.\s*from\('workers'\)/i, 'Expected workers lookup');
  assert.match(content, /supabase\s*\.\s*from\('projects'\)/i, 'Expected projects lookup');
});

test('TrainingGatesPage integrates TrainingGateForm and status actions', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /<TrainingGateForm/i, 'Expected TrainingGateForm usage');
  assert.match(content, /handleStatusChange/i, 'Expected status change handler');
  assert.match(content, /supabase\s*\.\s*from\('training_gates'\)\s*\.update/i, 'Expected update call for gate status');
});
