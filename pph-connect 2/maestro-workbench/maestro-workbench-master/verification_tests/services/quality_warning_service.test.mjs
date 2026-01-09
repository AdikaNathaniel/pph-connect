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

const servicePath = resolvePath('src', 'services', 'qualityWarningService.ts');

test('qualityWarningService exports triggerQualityWarning helper', () => {
  assert.ok(existsSync(servicePath), 'Expected qualityWarningService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+interface\s+QualityWarningInput/, 'Expected QualityWarningInput interface');
  assert.match(content, /export\s+async\s+function\s+triggerQualityWarning/, 'Expected triggerQualityWarning export');
});

test('qualityWarningService upserts warnings and invokes send-message', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /from\('quality_warnings'\)/, 'Expected quality_warnings query');
  assert.match(content, /\.insert\(/, 'Expected insert call');
  assert.match(content, /supabase\.functions\.invoke\('send-message'/, 'Expected send-message invocation');
});
