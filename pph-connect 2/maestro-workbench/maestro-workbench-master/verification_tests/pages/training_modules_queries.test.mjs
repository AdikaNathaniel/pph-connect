import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const trainingModulesPath = resolvePath('src', 'pages', 'manager', 'TrainingModules.tsx');
const trainingModulesContent = readFileSync(trainingModulesPath, 'utf8');

test('TrainingModules limits supabase selections', () => {
  assert.doesNotMatch(
    trainingModulesContent,
    /\.from\('training_modules'\)\s*\.select\('\*'\)/,
    'training_modules query should not request all columns'
  );
  assert.match(
    trainingModulesContent,
    /\.from\('training_modules'\)\s*\.select\(\s*`[^`]+created_at[^`]*`\s*\)/,
    'training_modules query should enumerate returned columns'
  );
  assert.doesNotMatch(
    trainingModulesContent,
    /\.from\('projects'\)\s*\.select\('\*'\)/,
    'projects query should not request all columns'
  );
  assert.match(
    trainingModulesContent,
    /\.from\('projects'\)\s*\.select\(\s*'id,\s*name,\s*training_module_id'\s*\)/,
    'projects query should limit selected columns'
  );
});
