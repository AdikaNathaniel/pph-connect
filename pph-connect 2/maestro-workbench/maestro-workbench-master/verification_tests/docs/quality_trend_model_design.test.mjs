import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'quality-trend-analysis.md'),
    path.join(process.cwd(), 'Reference Docs', 'quality-trend-analysis.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate quality-trend-analysis.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Quality trend analysis doc covers model, prediction, alerts, and interventions', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /time series|model/i, 'Expected model description');
  assert.match(content, /predict/i, 'Expected prediction plan');
  assert.match(content, /alert/i, 'Expected alert strategy');
  assert.match(content, /intervention/i, 'Expected intervention recommendations');
});
