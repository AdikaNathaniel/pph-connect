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

const servicePath = resolvePath('src', 'services', 'qualificationService.ts');

test('qualificationService exports listWorkerQualifications and listAvailableQualifications', () => {
  assert.ok(existsSync(servicePath), 'Expected qualificationService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+listWorkerQualifications/, 'Expected listWorkerQualifications export');
  assert.match(content, /export\s+async\s+function\s+listAvailableQualifications/, 'Expected listAvailableQualifications export');
});

test('qualificationService queries skill_assessments table for worker results and definitions', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /from\('skill_assessments'\)\s*\.select/, 'Expected select from skill_assessments');
  assert.match(content, /\.eq\('worker_id',\s*workerId\)/, 'Expected worker filter in listWorkerQualifications');
  assert.match(content, /\.is\('worker_id',\s+null\)/, 'Expected definition query for available qualifications');
});

test('qualificationService exposes expiring qualification helper with date filters', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+listExpiringQualifications/, 'Expected expiring qualification helper export');
  assert.match(content, /\.lt\('expires_at'/, 'Expected expiration comparison in query');
  assert.match(content, /\.gt\('expires_at'/, 'Expected lower bound filter for expiration window');
});
