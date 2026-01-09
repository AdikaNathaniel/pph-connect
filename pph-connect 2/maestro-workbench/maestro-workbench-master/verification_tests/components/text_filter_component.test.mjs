import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'TextFilter.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'TextFilter.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate TextFilter.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('TextFilter exports expected API', () => {
  assert.match(content, /export\s+type\s+TextFilterMode/, 'Expected TextFilterMode export');
  assert.match(content, /export\s+interface\s+TextFilterOption/, 'Expected TextFilterOption export');
  assert.match(content, /export\s+interface\s+TextFilterProps/, 'Expected TextFilterProps export');
  assert.match(content, /export\s+const\s+TextFilter/, 'Expected TextFilter component export');
});

test('TextFilter renders dialog shell with field title and controls', () => {
  assert.match(
    content,
    /import\s+\{\s*Dialog,\s*DialogContent,\s*DialogDescription,\s*DialogFooter,\s*DialogHeader,\s*DialogTitle\s*\}\s+from '@\/components\/ui\/dialog'/,
    'Expected dialog import'
  );
  assert.match(content, /<Dialog\s+open=\{open\}\s+onOpenChange=\{onOpenChange\}>/, 'Expected dialog wrapper');
  assert.match(content, /data-testid="text-filter-modal"/, 'Expected modal test id');
  assert.match(content, /fieldLabel/, 'Expected field label prop usage for title');
});

test('TextFilter implements mode selector and search input', () => {
  assert.match(
    content,
    /import\s+\{\s*Select,\s*SelectContent,\s*SelectItem,\s*SelectTrigger,\s*SelectValue\s*\}\s+from '@\/components\/ui\/select'/,
    'Expected Select import'
  );
  assert.match(content, /data-testid="text-filter-mode"/, 'Expected mode selector test id');
  assert.match(content, /onModeChange/, 'Expected onModeChange handler prop');
  assert.match(content, /placeholder="Search values"/, 'Expected search input placeholder');
  assert.match(content, /onSearchChange/, 'Expected onSearchChange handler prop');
});

test('TextFilter lists options with checkboxes and counts', () => {
  assert.match(content, /filteredOptions\.map/, 'Expected options iteration');
  assert.match(content, /data-testid="text-filter-option"/, 'Expected option item test id');
  assert.match(content, /Checkbox/, 'Expected Checkbox usage for selecting values');
  assert.match(content, /option\.count/, 'Expected count display per option');
  assert.match(content, /data-testid="text-filter-select-all"/, 'Expected select all control');
  assert.match(content, /selectedCount/, 'Expected selected count indicator');
});

test('TextFilter supports paste import and null toggles', () => {
  assert.match(content, /textarea/i, 'Expected textarea for comma-separated paste');
  assert.match(content, /onPasteValues/, 'Expected onPasteValues handler');
  assert.match(content, /includeNull/, 'Expected null inclusion toggle');
  assert.match(content, /data-testid="text-filter-include-null"/, 'Expected include-null checkbox');
});

test('TextFilter exposes action footer', () => {
  assert.match(content, /data-testid="text-filter-apply"/, 'Expected apply button');
  assert.match(content, /onApply/, 'Expected apply handler prop');
  assert.match(content, /Button variant="outline"/, 'Expected cancel button styling');
});
