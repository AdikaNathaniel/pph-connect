import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'patterns', 'SummaryCard.tsx'),
  path.join(process.cwd(), 'src', 'components', 'patterns', 'SummaryCard.tsx')
];

const summaryCardPath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate SummaryCard.tsx');
  }
  return match;
})();

const content = readFileSync(summaryCardPath, 'utf8');

test('SummaryCard exports component and skeleton helpers', () => {
  assert.match(content, /export\s+interface\s+SummaryCardProps/, 'Expected SummaryCardProps interface export');
  assert.match(content, /export\s+const\s+SummaryCard\b/, 'Expected SummaryCard component export');
  assert.match(content, /export\s+const\s+SummaryCardSkeleton\b/, 'Expected SummaryCardSkeleton export');
});

test('SummaryCard supports loading and error states', () => {
  assert.match(content, /isLoading/, 'Expected isLoading prop handling');
  assert.match(content, /isError/, 'Expected isError prop handling');
  assert.match(content, /errorMessage/, 'Expected error message support');
});

test('SummaryCard renders optional navigation link', () => {
  assert.match(content, /href\?:\s*string/, 'Expected href prop definition');
  assert.match(
    content,
    /import\s+\{\s*Link\s*\}\s+from\s+'react-router-dom'/,
    'Expected react-router Link import'
  );
  assert.match(content, /<Link\s+to=\{href\}/, 'Expected Link wrapping when href provided');
});
