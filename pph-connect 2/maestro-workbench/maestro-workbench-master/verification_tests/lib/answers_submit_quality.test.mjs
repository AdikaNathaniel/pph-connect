import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const answersPath = path.join(process.cwd(), 'src', 'lib', 'answers.ts');

test('submitAnswer triggers gold metrics refresh via quality service', () => {
  const content = readFileSync(answersPath, 'utf8');

  assert.match(
    content,
    /import\s*\{\s*refreshGoldStandardMetrics\s*\}\s*from\s+'@\/services\/qualityService';/i,
    'Expected submitAnswer to import refreshGoldStandardMetrics helper'
  );

  assert.match(
    content,
    /await\s+refreshGoldStandardMetrics\(/i,
    'Expected submitAnswer to invoke gold metrics refresh'
  );

  assert.match(
    content,
    /trustRating\??:\s*number\s*\|\s*null/i,
    'Expected SubmitAnswerResult to include trustRating field'
  );

  assert.match(
    content,
    /select\('id,\s*question_id,\s*required_replications,\s*is_gold_standard,\s*correct_answer'\)/i,
    'Expected questions select to include correct_answer payload'
  );

  assert.match(
    content,
    /goldAccuracy\??:\s*number\s*\|\s*null/i,
    'Expected SubmitAnswerResult to expose goldAccuracy'
  );

  assert.match(
    content,
    /goldMatch\??:\s*boolean\s*\|\s*null/i,
    'Expected SubmitAnswerResult to surface goldMatch result'
  );
});
