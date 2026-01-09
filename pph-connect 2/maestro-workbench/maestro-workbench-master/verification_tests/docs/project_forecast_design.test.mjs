import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'project-completion-forecasting.md'),
    path.join(process.cwd(), 'Reference Docs', 'project-completion-forecasting.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate project-completion-forecasting.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Project completion forecasting doc covers inputs, model, outputs, and update cadence', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /input/i, 'Expected inputs section');
  assert.match(content, /model/i, 'Expected model description');
  assert.match(content, /confidence/i, 'Expected confidence interval mention');
  assert.match(content, /daily|update/i, 'Expected update cadence');
});
