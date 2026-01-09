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

const servicePath = resolvePath('src', 'services', 'accessService.ts');

test('accessService exports ProjectAccessResult and getAvailableProjects', () => {
  assert.ok(existsSync(servicePath), 'Expected accessService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+interface\s+ProjectAccessResult/, 'Expected ProjectAccessResult interface');
  assert.match(content, /export\s+async\s+function\s+getAvailableProjects/, 'Expected getAvailableProjects export');
});

test('accessService queries listings, thresholds, skills, gates, violations', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /from\('project_listings'\)/, 'Expected project listings query');
  assert.match(content, /\.eq\('is_active',\s*true\)/, 'Expected active listing filter');
  assert.match(content, /from\('performance_thresholds'\)/, 'Expected thresholds query');
  assert.match(content, /from\('worker_skills'\)/, 'Expected worker skills query');
  assert.match(content, /from\('training_gates'\)/, 'Expected training gates query');
  assert.match(content, /from\('auto_removals'\)/, 'Expected auto removals query');
});

test('accessService relies on quality helper and returns gating metadata', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /calculateWorkerQualityScore/, 'Expected quality helper usage');
  assert.match(content, /reasons\s*:/, 'Expected reasons field in result');
  assert.match(content, /return\s+accessResults;,?/, 'Expected accessResults return value');
});

test('accessService checks required qualifications for project listings', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /required_qualifications/, 'Expected project qualification field usage');
  assert.match(content, /missing_qualifications/, 'Expected missing qualifications gating reason');
  assert.match(content, /qualification_expired/, 'Expected qualification expiration gating reason');
  assert.match(content, /expires_at/, 'Expected expires_at field usage when checking qualifications');
});
