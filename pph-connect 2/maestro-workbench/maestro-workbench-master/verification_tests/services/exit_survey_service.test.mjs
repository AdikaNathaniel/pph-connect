import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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

const servicePath = resolvePath('src', 'services', 'exitSurveyService.ts');
const content = readFileSync(servicePath, 'utf8');

test('exitSurveyService exports submission helpers', () => {
  [
    /export\s+async\s+function\s+submitExitSurvey/i,
    /export\s+async\s+function\s+fetchExitSurvey/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} export`);
  });
});

test('exitSurveyService persists survey responses to worker_exit_surveys', () => {
  assert.match(content, /supabase[\s\S]+\.from\('worker_exit_surveys'\)/i, 'Expected worker_exit_surveys table usage');
  ['reason', 'overall_rating', 'improvement_suggestions', 'would_recommend', 'additional_feedback'].forEach((field) => {
    assert.match(content, new RegExp(field, 'i'), `Expected ${field} mapping`);
  });
});
