import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const servicePath = resolvePath('src', 'services', 'aiInterviewService.ts');

test('aiInterviewService exports core interview helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected aiInterviewService to exist');
  const content = readFileSync(servicePath, 'utf8');
  [
    /export\s+async\s+function\s+startInterview/i,
    /export\s+async\s+function\s+askQuestion/i,
    /export\s+async\s+function\s+evaluateAnswer/i,
    /export\s+async\s+function\s+generateInterviewReport/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected pattern ${pattern}`);
  });
});

test('aiInterviewService defines question bank and session store', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /const\s+QUESTION_BANK\b/, 'Expected QUESTION_BANK constant');
  assert.match(content, /new\s+Map<.*InterviewSessionState/i, 'Expected Map-based session store');
  assert.match(content, /crypto\.randomUUID\(/i, 'Expected random session ids');
});

test('aiInterviewService tracks progress and scoring', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /progress:\s*{\s*asked:/i, 'Expected progress payload');
  assert.match(content, /answers\.push/i, 'Expected answer tracking');
  assert.match(content, /const\s+score\s*=\s*/i, 'Expected scoring calculation');
  assert.match(content, /transcript/i, 'Expected transcript generation');
});
