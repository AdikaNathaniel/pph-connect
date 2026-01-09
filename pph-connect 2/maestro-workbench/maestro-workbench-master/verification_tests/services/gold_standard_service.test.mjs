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

const servicePath = resolvePath('src', 'services', 'goldStandardService.ts');

test('goldStandardService exports required helpers', () => {
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+async\s+function\s+fetchGoldStandardQuestions/i,
    /export\s+async\s+function\s+bulkUpdateGoldStandards/i,
    /export\s+async\s+function\s+createGoldStandardQuestion/i,
    /export\s+async\s+function\s+updateGoldDistributionTarget/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected ${pattern} definition`);
  });
});

test('fetchGoldStandardQuestions queries questions table', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /supabase[\s\S]+\.from\('questions'\)[\s\S]+select\(/i,
    'Expected questions select query'
  );
  assert.match(content, /is_gold_standard/i, 'Expected gold flag usage');
});

test('bulkUpdateGoldStandards uses upsert/update on questions', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /\.from\('questions'\)[\s\S]+update/i,
    'Expected update statement for questions table'
  );
});

test('createGoldStandardQuestion inserts questions row', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /\.from\('questions'\)[\s\S]+insert/i,
    'Expected insert into questions'
  );
});

test('updateGoldDistributionTarget stores distribution in performance_thresholds', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(
    content,
    /\.from\('performance_thresholds'\)[\s\S]+insert/i,
    'Expected insert into performance_thresholds table'
  );
  assert.match(
    content,
    /\.from\('performance_thresholds'\)[\s\S]+update/i,
    'Expected update path for existing distribution target'
  );
  assert.match(content, /'gold_distribution'/i, 'Expected metric type for distribution');
});
