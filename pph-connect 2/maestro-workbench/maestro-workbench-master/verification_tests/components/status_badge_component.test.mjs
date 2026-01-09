import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const badgePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'status', 'StatusBadge.tsx'),
    path.join(process.cwd(), 'src', 'components', 'status', 'StatusBadge.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate StatusBadge.tsx');
  }
  return match;
})();

const content = readFileSync(badgePath, 'utf8');

test('StatusBadge exports expected API', () => {
  assert.match(content, /export\s+type\s+WorkerStatus/, 'Expected WorkerStatus type export');
  assert.match(content, /export\s+interface\s+StatusBadgeProps/, 'Expected StatusBadgeProps interface export');
  assert.match(content, /export\s+const\s+StatusBadge/, 'Expected StatusBadge component export');
  assert.match(content, /import\s+\{\s*Badge\s*\}\s+from '@\/components\/ui\/badge'/, 'Expected Badge import');
});

test('StatusBadge maps core statuses to color-coded classes', () => {
  assert.match(content, /pending:\s*\{[^}]*border-amber-200[^}]*bg-amber-100[^}]*text-amber-800/, 'Expected pending status to use amber colorway');
  assert.match(content, /active:\s*\{[^}]*border-emerald-200[^}]*bg-emerald-100[^}]*text-emerald-800/, 'Expected active status to use emerald colorway');
  assert.match(content, /inactive:\s*\{[^}]*border-slate-200[^}]*bg-slate-100[^}]*text-slate-600/, 'Expected inactive status to use neutral slate colorway');
  assert.match(content, /terminated:\s*\{[^}]*border-red-200[^}]*bg-red-100[^}]*text-red-800/, 'Expected terminated status to use red colorway');
  assert.match(content, /const\s+DEFAULT_BADGE_STYLE\s*=/, 'Expected default badge style fallback');
});

test('StatusBadge handles unknown statuses gracefully', () => {
  assert.match(content, /const\s+normalized\s*=/, 'Expected status normalization logic');
  assert.match(content, /config\s*=\s*STATUS_STYLES\[normalized]/, 'Expected lookup using normalized status');
  assert.match(
    content,
    /DEFAULT_BADGE_STYLE\s*=\s*\{\s*label:\s*['"]Unknown['"],\s*className:\s*['"][^'"]*border-muted-foreground\/20[^'"]*bg-muted[^'"]*text-muted-foreground/,
    'Expected default style to use muted badge appearance with Unknown label'
  );
});
