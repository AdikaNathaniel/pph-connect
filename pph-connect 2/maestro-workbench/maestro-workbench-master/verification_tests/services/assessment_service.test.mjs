import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const servicePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'services', 'assessmentService.ts'),
    path.join(process.cwd(), 'src', 'services', 'assessmentService.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Unable to locate assessmentService.ts');
  }
  return match;
})();

const content = readFileSync(servicePath, 'utf8');

test('assessmentService exports create/list helpers', () => {
  assert.match(content, /export\s+async\s+function\s+createAssessmentDefinition/, 'Expected createAssessmentDefinition export');
  assert.match(content, /export\s+async\s+function\s+listAssessmentDefinitions/, 'Expected listAssessmentDefinitions export');
});

test('assessmentService interacts with skill_assessments table', () => {
  assert.match(content, /from\('skill_assessments'\)\.insert/, 'Expected insert into skill_assessments');
  assert.match(content, /from\('skill_assessments'\)\s*\.select/, 'Expected select from skill_assessments');
  assert.match(content, /metadata/, 'Expected metadata handling');
});

test('assessmentService exposes recordAssessmentResult helper for worker submissions', () => {
  assert.match(content, /export\s+(?:interface|type)\s+AssessmentResultSubmission/, 'Expected AssessmentResultSubmission type/interface');
  assert.match(content, /export\s+async\s+function\s+recordAssessmentResult/, 'Expected recordAssessmentResult export');
  assert.match(
    content,
    /worker_id\s*:/,
    'Expected worker_id to be included when storing assessment results'
  );
  assert.match(
    content,
    /metadata\s*:\s*{[\s\S]+responses[\s\S]+breakdown/,
    'Expected responses and breakdown fields persisted in metadata'
  );
});

test('assessmentService exports manual grading submission helper', () => {
  assert.match(content, /export\s+(?:interface|type)\s+ManualGradeSubmission/, 'Expected ManualGradeSubmission type/interface');
  assert.match(content, /export\s+async\s+function\s+submitManualGrade/, 'Expected submitManualGrade export');
  assert.match(content, /from\('skill_assessments'\)[\s\S]+\.update/, 'Expected update call for manual grade');
});
