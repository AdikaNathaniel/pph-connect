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

const pagePath = resolvePath('src', 'pages', 'manager', 'NewPlugin.tsx');
const builderPath = resolvePath('src', 'components', 'modality', 'CustomModalityBuilder.tsx');

test('NewPlugin renders CustomModalityBuilder entry point', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /import\s+CustomModalityBuilder\s+from\s+'@\/components\/modality\/CustomModalityBuilder';/,
    'Expected builder import'
  );
});

test('CustomModalityBuilder exposes creator props', () => {
  const content = readFileSync(builderPath, 'utf8');
  assert.match(content, /interface\s+CustomModalityBuilderProps/i, 'Expected props interface');
  ['onCreate', 'initialValues', 'onClose'].forEach((prop) => {
    assert.match(content, new RegExp(prop, 'i'), `Expected prop ${prop}`);
  });
  assert.match(content, /annotationTools/i, 'Expected annotation tool configuration');
  assert.match(content, /validationRules/i, 'Expected validation rule inputs');
});
