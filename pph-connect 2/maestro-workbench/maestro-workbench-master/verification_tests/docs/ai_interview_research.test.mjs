import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'Reference Docs', 'ai-interview-platform-research.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'ai-interview-platform-research.md'),
  path.join(process.cwd(), 'docs', 'ai-interview-platform-research.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'docs', 'ai-interview-platform-research.md')
].filter((candidate) => existsSync(candidate));

if (candidatePaths.length === 0) {
  throw new Error('Could not locate ai-interview-platform-research.md');
}

const docPath = candidatePaths[0];

function getSection(content, heading) {
  const headingPattern = new RegExp(`##\\s+${heading}[^]*?(?=\n##\\s+|$)`, 'i');
  const match = content.match(headingPattern);
  assert.ok(match, `Missing section for ${heading}`);
  return match[0];
}

test('AI interview research doc evaluates prioritized platforms', () => {
  const content = readFileSync(docPath, 'utf8');

  const platforms = [
    'OpenAI GPT-4',
    'Anthropic Claude',
    'Custom Fine-Tuned Model'
  ];

  platforms.forEach((platform) => {
    const section = getSection(content, platform);

    ['Cost', 'Latency', 'Quality', 'Multilingual'].forEach((dimension) => {
      assert.match(
        section,
        new RegExp(`${dimension}\\s*:`, 'i'),
        `${platform} section must mention ${dimension}`
      );
    });
  });
});

test('AI interview research doc records a clear recommendation', () => {
  const content = readFileSync(docPath, 'utf8');
  const section = getSection(content, 'Recommendation');

  assert.match(section, /OpenAI GPT-4/i, 'Recommendation should identify OpenAI GPT-4 as the primary platform');

  ['cost', 'quality', 'multilingual'].forEach((keyword) => {
    assert.match(
      section,
      new RegExp(keyword, 'i'),
      `Recommendation must mention ${keyword} rationale`
    );
  });
});
