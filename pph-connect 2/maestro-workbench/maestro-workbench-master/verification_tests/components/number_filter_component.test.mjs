import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'NumberFilter.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'NumberFilter.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate NumberFilter.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('NumberFilter exports expected API', () => {
  assert.match(content, /export\s+type\s+NumberFilterOperator/, 'Expected NumberFilterOperator export');
  assert.match(content, /export\s+interface\s+NumberFilterProps/, 'Expected NumberFilterProps export');
  assert.match(content, /export\s+const\s+NumberFilter/, 'Expected NumberFilter component export');
});

test('NumberFilter renders dialog with operator selector', () => {
  assert.match(
    content,
    /import\s+\{\s*Dialog,\s*DialogContent,\s*DialogDescription,\s*DialogFooter,\s*DialogHeader,\s*DialogTitle\s*\}\s+from '@\/components\/ui\/dialog'/,
    'Expected dialog imports'
  );
  assert.match(content, /data-testid="number-filter-modal"/, 'Expected modal test id');
  assert.match(content, /data-testid="number-filter-operator"/, 'Expected operator select test id');
  assert.match(content, /(OPERATOR_OPTIONS|operators)\.map/, 'Expected operator iteration');
});

test('NumberFilter exposes numeric inputs and validation messaging', () => {
  assert.match(content, /data-testid="number-filter-primary"/, 'Expected primary number input');
  assert.match(content, /data-testid="number-filter-secondary"/, 'Expected secondary number input');
  assert.match(content, /showSecondaryInput/, 'Expected conditional secondary input logic');
  assert.match(content, /errorMessage/, 'Expected error message prop');
  assert.match(content, /className="text-xs text-destructive"/, 'Expected error text style');
});

test('NumberFilter provides apply footer', () => {
  assert.match(content, /data-testid="number-filter-apply"/, 'Expected apply button with test id');
  assert.match(content, /onApply/, 'Expected apply handler prop usage');
  assert.match(content, /Button variant="outline"/, 'Expected cancel button styling');
});
