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

test('NewPlugin renders modality preset cards', () => {
  const content = readFileSync(pagePath, 'utf8');
  ['text', 'image', 'video', 'multimodal'].forEach((preset) => {
    assert.match(
      content,
      new RegExp(`modality-preset-\\$\\{preset\\.id\\}`, 'i'),
      `Expected identifier for ${preset} preset`
    );
  });
  assert.match(
    content,
    /Apply\s+Preset/i,
    'Expected apply preset action'
  );
});

test('NewPlugin imports modality presets helper', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /import\s*\{\s*MODALITY_PRESETS\s*\}\s*from\s+'@\/lib\/modalityPresets';/i,
    'Expected import from modalityPresets helper'
  );
});
