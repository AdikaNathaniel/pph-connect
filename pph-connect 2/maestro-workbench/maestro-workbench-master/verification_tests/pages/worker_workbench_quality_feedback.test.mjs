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

const workbenchPath = resolvePath('src', 'pages', 'worker', 'Workbench.tsx');
const componentPath = resolvePath('src', 'components', 'workbench', 'QualityFeedbackCard.tsx');

test('Worker Workbench renders real-time quality feedback panel', () => {
  const content = readFileSync(workbenchPath, 'utf8');
  assert.match(
    content,
    /import\s+QualityFeedbackCard\s+from\s+'@\/components\/workbench\/QualityFeedbackCard';/,
    'Expected Workbench to import QualityFeedbackCard'
  );
  assert.match(content, /<QualityFeedbackCard[\s\S]+trainingHref=/, 'Expected Workbench to render QualityFeedbackCard');
  assert.match(content, /trainingHref\s*=\s*['"]\/worker\/training['"]/, 'Expected feedback card to link to worker training resources');
});

test('QualityFeedbackCard component exposes props for score, accuracy, and gold errors', () => {
  const content = readFileSync(componentPath, 'utf8');
  assert.match(content, /interface\s+QualityFeedbackCardProps/i, 'Expected props interface definition');
  ['qualityScore', 'goldAccuracy', 'goldMatch', 'onDismiss'].forEach((prop) => {
    assert.match(content, new RegExp(prop, 'i'), `Expected prop ${prop}`);
  });
  assert.match(content, /data-testid="workbench-quality-feedback"/, 'Expected component test id');
});
