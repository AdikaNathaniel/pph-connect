import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'tier-criteria.md'),
    path.join(process.cwd(), 'Reference Docs', 'tier-criteria.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate tier-criteria.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Tier criteria doc defines Tier0→Tier1, Tier1→Tier2, and demotion rules', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /Tier0\s*→\s*Tier1/i, 'Expected Tier0 to Tier1 section');
  assert.match(content, /Tier1\s*→\s*Tier2/i, 'Expected Tier1 to Tier2 section');
  assert.match(content, /Demotion/i, 'Expected demotion criteria');
});
