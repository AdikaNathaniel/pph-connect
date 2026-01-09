import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const modalPath = resolvePath('src', 'components', 'stats', 'StatsImportModal.tsx');
const modalContent = readFileSync(modalPath, 'utf8');

test('StatsImportModal exports component', () => {
  assert.match(modalContent, /export\s+const\s+StatsImportModal/, 'Expected named export');
  assert.match(modalContent, /export\s+default\s+StatsImportModal/, 'Expected default export');
});

test('StatsImportModal implements stepper with required stages', () => {
  assert.match(modalContent, /const\s+STEPS\s*=\s*\[/, 'Expected steps definition');
  assert.match(modalContent, /'template'/, 'Expected template step');
  assert.match(modalContent, /'upload'/, 'Expected upload step');
  assert.match(modalContent, /'validate'/, 'Expected validate step');
  assert.match(modalContent, /'import'/, 'Expected import step');
  assert.match(modalContent, /data-testid="stats-import-stepper"/, 'Expected stepper test id');
});

test('StatsImportModal exposes download template handler', () => {
  assert.match(modalContent, /generateStatsTemplate/, 'Expected template generator usage');
  assert.match(modalContent, /data-testid="stats-download-template"/, 'Expected download button test id');
});

test('StatsImportModal renders upload dropzone and validation feedback', () => {
  assert.match(modalContent, /data-testid="stats-upload-dropzone"/, 'Expected dropzone test id');
  assert.match(modalContent, /data-testid="stats-validation-summary"/, 'Expected validation summary placeholder');
  assert.match(modalContent, /CSV_COLUMNS\s*=\s*\[/, 'Expected CSV column definition array');
});
