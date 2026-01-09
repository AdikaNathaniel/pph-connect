import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const trainingPagePath = path.join(
  process.cwd(),
  'maestro-workbench',
  'maestro-workbench-master',
  'src',
  'pages',
  'manager',
  'TrainingModules.tsx'
);

test('TrainingModules page exists and exports component', () => {
  assert.ok(existsSync(trainingPagePath), 'Expected TrainingModules.tsx to exist');
  const content = readFileSync(trainingPagePath, 'utf8');

  assert.match(content, /const\s+TrainingModules\s*=\s*\(\)\s*=>/i, 'Expected TrainingModules component definition');
  assert.match(content, /export\s+default\s+TrainingModules/i, 'Expected default export for TrainingModules');
});

test('TrainingModules page fetches modules and projects for listing', () => {
  const content = readFileSync(trainingPagePath, 'utf8');

  assert.match(content, /supabase\s*\.\s*from\('training_modules'\)/i, 'Expected training_modules query');
  assert.match(content, /TableHead>\s*Title\s*<\/TableHead>/i, 'Expected table column for training list');
  assert.match(content, /projects_using/i, 'Expected modules to show projects using each training material');
  assert.match(content, /supabase\s*\.\s*from\('projects'\)\s*\.select\('id,\s*name,\s*training_module_id'\)/i, 'Expected project fetch to link trainings to projects');
});

test('TrainingModules page supports creating and editing training content', () => {
  const content = readFileSync(trainingPagePath, 'utf8');

  assert.match(content, /handleCreateModule/i, 'Expected create handler');
  assert.match(content, /supabase\s*\.\s*from\('training_modules'\)\s*\.insert/i, 'Expected insert into training_modules');
  assert.match(content, /video_url/i, 'Expected field for linking video content');
  assert.match(content, /Label\s+htmlFor="content">Content\s*\(Markdown\)/i, 'Expected markdown content field label');
  assert.match(content, /handleUpdateModule/i, 'Expected update handler for editing content');
});

test('TrainingModules page tracks worker access/completions', () => {
  const content = readFileSync(trainingPagePath, 'utf8');

  assert.match(content, /supabase\s*\.\s*from\('worker_training_completions'\)/i, 'Expected worker_training_completions query');
  assert.match(content, /DialogTitle>Training Completions<\/DialogTitle>/i, 'Expected completions modal');
  assert.match(content, /TableHead>\s*Worker\s*<\/TableHead>/i, 'Expected worker column in completions table');
});
