import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolve = (...segments) => {
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

const modulePath = resolve('src', 'lib', 'taskUnlocking.ts');

test('taskUnlocking module exports constants and helpers', () => {
  const content = readFileSync(modulePath, 'utf8');
  assert.match(content, /export\s+const\s+DIFFICULTY_ORDER\s*=/, 'Expected DIFFICULTY_ORDER constant');
  assert.match(content, /export\s+const\s+DEFAULT_UNLOCKED_LEVELS(?:\s*:\s*[^=]+)?\s*=/, 'Expected default unlocked levels');
  assert.match(content, /export\s+function\s+getUnlockedDifficulties/, 'Expected getUnlockedDifficulties function');
  assert.match(
    content,
    /COMPLETION_THRESHOLDS(?:\s*:\s*[^=]+)?\s*=\s*{[\s\S]*beginner:/i,
    'Expected completion thresholds map'
  );
  assert.match(
    content,
    /QUALITY_SCORE_REQUIREMENTS(?:\s*:\s*[^=]+)?\s*=/,
    'Expected quality score requirements constant'
  );
  assert.match(content, /TRAINING_GATE_REQUIRED/, 'Expected training gate checks');
  assert.match(content, /DOMAIN_ASSESSMENT_REQUIRED/, 'Expected domain assessments requirement');
});
