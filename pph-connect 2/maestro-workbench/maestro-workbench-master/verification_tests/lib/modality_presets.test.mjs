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

const presetsPath = resolvePath('src', 'lib', 'modalityPresets.ts');
const content = readFileSync(presetsPath, 'utf8');

test('modalityPresets exports text/image/video/multimodal presets', () => {
  assert.match(content, /export\s+const\s+MODALITY_PRESETS/i, 'Expected MODALITY_PRESETS export');
  ['text', 'image', 'video', 'multimodal'].forEach((key) => {
    assert.match(content, new RegExp(`${key}:\\s*{`, 'i'), `Expected ${key} preset definition`);
  });
});

test('modalityPresets define modality config and default columns', () => {
  assert.match(content, /defaultColumns\s*:/i, 'Expected defaultColumns definition');
  assert.match(content, /modalityConfig\s*:\s*{[\s\S]+}/i, 'Expected modalityConfig definition');
  assert.match(content, /features\s*:\s*\[/i, 'Expected features list');
});
