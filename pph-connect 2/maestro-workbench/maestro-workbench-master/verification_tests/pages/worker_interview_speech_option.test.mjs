import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const pagePath = resolvePath('src', 'pages', 'worker', 'InterviewPage.tsx');

test('InterviewPage exposes speech-to-text controls when browser supports SpeechRecognition', () => {
  assert.ok(existsSync(pagePath), 'Expected InterviewPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /window\.SpeechRecognition|window\.webkitSpeechRecognition/, 'Expected speech recognition checks');
  assert.match(content, /data-testid="worker-interview-voice-toggle"/, 'Expected voice toggle button');
  assert.match(content, /listening/i, 'Expected listening state handling');
  assert.match(content, /transcribe/i, 'Expected transcription handler');
});
