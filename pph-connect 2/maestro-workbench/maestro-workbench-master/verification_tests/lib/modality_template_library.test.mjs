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

const libraryPath = resolvePath('src', 'lib', 'modalityTemplates.ts');
const content = readFileSync(libraryPath, 'utf8');

const REQUIRED_TEMPLATES = [
  'imageClassification',
  'objectDetection',
  'namedEntityRecognition',
  'machineTranslationEvaluation',
  'chatbotConversationRating',
];

test('modality template library exports required presets', () => {
  assert.match(content, /export\s+const\s+MODALITY_TEMPLATES/i, 'Expected MODALITY_TEMPLATES export');
  REQUIRED_TEMPLATES.forEach((key) => {
    assert.match(content, new RegExp(`${key}:\\s*{`, 'i'), `Expected ${key} template definition`);
  });
});

test('templates define modality, description, and default columns', () => {
REQUIRED_TEMPLATES.forEach((key) => {
    assert.match(content, new RegExp(`${key}:\\s*{[\\s\\S]+modality:`, 'i'), `Expected ${key} to specify modality`);
    assert.match(content, new RegExp(`${key}:\\s*{[\\s\\S]+description:`, 'i'), `Expected ${key} description`);
    assert.match(content, new RegExp(`${key}:\\s*{[\\s\\S]+columns:`, 'i'), `Expected ${key} columns definition`);
  });
});
