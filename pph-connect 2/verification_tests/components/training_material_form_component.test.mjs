import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const formPath = path.join(
  process.cwd(),
  'src',
  'components',
  'training',
  'TrainingMaterialForm.tsx'
);

test('TrainingMaterialForm component file exists and exports default component', () => {
  assert.ok(existsSync(formPath), 'Expected TrainingMaterialForm.tsx to exist');
  const content = readFileSync(formPath, 'utf8');
  assert.match(content, /const\s+TrainingMaterialForm\s*:\s*React\.FC/i, 'Expected component definition');
  assert.match(content, /export\s+default\s+TrainingMaterialForm/i, 'Expected default export');
});

test('TrainingMaterialForm renders required fields', () => {
  const content = readFileSync(formPath, 'utf8');
  assert.match(content, /Label\s+htmlFor="project"/i, 'Expected project select label');
  assert.match(content, /Label\s+htmlFor="title"/i, 'Expected title input label');
  assert.match(content, /Label\s+htmlFor="description"/i, 'Expected description textarea label');
  assert.match(content, /Label\s+htmlFor="type"/i, 'Expected training type select label');
  assert.match(content, /Label\s+htmlFor="url"/i, 'Expected URL input label');
  assert.match(content, /type="file"/i, 'Expected file upload input');
});

test('TrainingMaterialForm handles Supabase storage upload and submission', () => {
  const content = readFileSync(formPath, 'utf8');
  assert.match(content, /supabase\s*\.\s*storage\s*\.\s*from\('training-materials'\)/i, 'Expected training-materials storage bucket upload');
  assert.match(content, /supabase\s*\.\s*from\('training_materials'\)/i, 'Expected insert into training_materials table');
  assert.match(content, /onSubmit/i, 'Expected form submit handler');
});
