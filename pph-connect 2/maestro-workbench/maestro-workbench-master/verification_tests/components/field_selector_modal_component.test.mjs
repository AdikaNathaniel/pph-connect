import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const modalPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'FieldSelectorModal.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'FieldSelectorModal.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate FieldSelectorModal.tsx');
  }
  return match;
})();

const content = readFileSync(modalPath, 'utf8');

test('FieldSelectorModal exports expected API', () => {
  assert.match(content, /export\s+interface\s+FieldSelectorOption/, 'Expected FieldSelectorOption export');
  assert.match(content, /export\s+interface\s+FieldSelectorModalProps/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+FieldSelectorModal/, 'Expected component export');
});

test('FieldSelectorModal renders Shadcn dialog primitives', () => {
  assert.match(
    content,
    /import\s+\{\s*Dialog,\s*DialogContent,\s*DialogDescription,\s*DialogHeader,\s*DialogTitle\s*\}\s+from '@\/components\/ui\/dialog'/,
    'Expected dialog imports'
  );
  assert.match(content, /<Dialog\s+open=\{open\}\s+onOpenChange=\{onOpenChange\}>/, 'Expected Dialog wrapper');
  assert.match(content, /data-testid="field-selector-modal"/, 'Expected data-testid for modal content');
});

test('FieldSelectorModal implements search and option list', () => {
  assert.match(content, /useMemo\(/, 'Expected memoization for filtered options');
  assert.match(content, /const\s+\[search,\s*setSearch\]\s*=\s*useState/, 'Expected search state');
  assert.match(content, /placeholder="Search fields"/, 'Expected search input placeholder');
  assert.match(content, /(options|items)\.map/, 'Expected mapping over options');
  assert.match(content, /data-testid="field-selector-option"/, 'Expected option item test id');
  assert.match(content, /onOptionSelect/, 'Expected option select handler prop');
});

test('FieldSelectorModal shows empty state and groups', () => {
  assert.match(content, /data-testid="field-selector-empty"/, 'Expected empty state placeholder');
  assert.match(content, /groupByCategory/, 'Expected grouping logic (category headings)');
  assert.match(content, /data-testid="field-selector-category"/, 'Expected category heading test id');
});
