import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'Dashboard.tsx'),
  path.join(process.cwd(), 'src', 'pages', 'manager', 'Dashboard.tsx')
];

const dashboardPath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate manager Dashboard.tsx');
  }
  return match;
})();

const content = readFileSync(dashboardPath, 'utf8');

test('Dashboard defines top-level layout skeleton with title and description', () => {
  assert.match(content, /const\s+Dashboard\s*:\s*React\.FC/, 'Expected Dashboard React.FC definition');
  assert.match(content, /<header[^>]*>/, 'Expected header wrapper around title block');
  assert.match(content, /<h1[^>]*>.*Dashboard.*<\/h1>/, 'Expected primary Dashboard heading');
  assert.match(
    content,
    /className="text-sm text-muted-foreground">/,
    'Expected supporting description paragraph with muted styling'
  );
});

test('Dashboard exposes summary metrics configuration and responsive grid', () => {
  assert.match(
    content,
    /import\s+\{\s*SUMMARY_CARD_CONFIG\s*\}\s+from\s+'\.\/config\/summaryCards'/,
    'Expected SUMMARY_CARD_CONFIG import'
  );
  assert.match(content, /sm:grid-cols-2/, 'Expected responsive breakpoint columns for summary cards');
  assert.match(content, /xl:grid-cols-4/, 'Expected wide breakpoint layout for summary cards');
});

test('Dashboard renders summary metrics through shared helper', () => {
  assert.match(content, /metrics\.map\(\s*\(metric\)\s*=>\s*<SummaryCard/, 'Expected metrics iteration with SummaryCard');
  assert.match(content, /SummaryCardSkeleton/, 'Expected SummaryCardSkeleton usage for loading state');
});

test('Dashboard defines alerts and quick actions sections with data sources', () => {
  assert.match(content, /export\s+const\s+ALERT_ITEMS/, 'Expected exported alert configuration array');
  assert.match(
    content,
    /import\s+\{\s*QUICK_ACTION_CONFIG\s*\}\s+from\s+'\.\/config\/quickActions'/,
    'Expected quick action config import'
  );
  assert.match(content, /aria-labelledby="alerts-heading"/, 'Expected alerts section accessible labelling');
  assert.match(content, /aria-labelledby="quick-actions-heading"/, 'Expected quick actions section accessible labelling');
});
