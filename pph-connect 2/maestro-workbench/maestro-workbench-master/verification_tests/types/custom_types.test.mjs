import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const appTypesPath = resolvePath(['src', 'types', 'app.ts']);
const barrelPath = resolvePath(['src', 'types', 'index.ts']);

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

test('app.ts defines Worker and Project interfaces with expected sections', () => {
  const content = readFile(appTypesPath);

  assert.match(content, /export\s+interface\s+Worker\b/, 'Expected Worker interface');
  assert.match(content, /primaryEmail\s*:\s*string/, 'Expected Worker.primaryEmail field');
  assert.match(content, /computed:\s*\{\s*fullName:/, 'Expected Worker.computed.fullName computed field');

  assert.match(content, /export\s+interface\s+Project\b/, 'Expected Project interface');
  assert.match(content, /teams:\s*Array<WorkerTeamAssignment>/, 'Expected Project relationship to worker assignments');
});

test('app.ts defines shared filter and response utility types', () => {
  const content = readFile(appTypesPath);

  assert.match(content, /export\s+type\s+FilterOperator\b/, 'Expected FilterOperator type');
  assert.match(content, /export\s+type\s+FilterValue\b/, 'Expected FilterValue type');
  assert.match(content, /export\s+interface\s+FilterState\b/, 'Expected FilterState interface');

  assert.match(content, /export\s+interface\s+ApiResponse<\w+>/, 'Expected ApiResponse<T> interface');
  assert.match(content, /export\s+interface\s+PaginatedResponse<\w+>/, 'Expected PaginatedResponse<T> interface');
});

test('app.ts defines CRUD form payload types', () => {
  const content = readFile(appTypesPath);

  assert.match(content, /export\s+type\s+WorkerFormValues\b/, 'Expected WorkerFormValues type');
  assert.match(content, /export\s+type\s+ProjectFormValues\b/, 'Expected ProjectFormValues type');
});

test('app.ts defines Phase 2 domain interfaces', () => {
  const content = readFile(appTypesPath);

  assert.match(content, /export\s+interface\s+WorkStats\b/, 'Expected WorkStats interface');
  assert.match(content, /export\s+interface\s+RateCard\b/, 'Expected RateCard interface');
  assert.match(content, /export\s+interface\s+Invoice\b/, 'Expected Invoice interface');
  assert.match(content, /export\s+interface\s+MessagingThreadSummary\b/, 'Expected messaging thread summary type');
  assert.match(content, /export\s+interface\s+TrainingGate\b/, 'Expected TrainingGate interface');
  assert.match(content, /export\s+interface\s+QualificationRequirement\b/, 'Expected qualification requirement interface');
});

test('app.ts defines Phase 3 marketplace and skill interfaces', () => {
  const content = readFile(appTypesPath);

  assert.match(content, /export\s+interface\s+ProjectListing\b/, 'Expected ProjectListing interface');
  assert.match(content, /export\s+interface\s+WorkerApplication\b/, 'Expected WorkerApplication interface');
  assert.match(content, /export\s+interface\s+Skill\b/, 'Expected Skill interface');
  assert.match(content, /export\s+interface\s+SkillAssessment\b/, 'Expected SkillAssessment interface');
  assert.match(content, /export\s+(type|interface)\s+MarketplaceFilterState\b/, 'Expected marketplace filter type');
});

test('types barrel file re-exports both database and app types', () => {
  const content = readFile(barrelPath);

  assert.match(content, /export\s+\*\s+from\s+'\.\/database';/, 'Expected database types re-export');
  assert.match(content, /export\s+\*\s+from\s+'\.\/app';/, 'Expected app types re-export');
});
