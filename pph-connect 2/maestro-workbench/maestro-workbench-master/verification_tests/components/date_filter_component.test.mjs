import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'DateFilter.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'DateFilter.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate DateFilter.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('DateFilter exports expected API', () => {
  assert.match(content, /export\s+type\s+DateFilterOperator/, 'Expected DateFilterOperator export');
  assert.match(content, /export\s+interface\s+DateFilterPreset/, 'Expected DateFilterPreset export');
  assert.match(content, /export\s+interface\s+DateFilterProps/, 'Expected DateFilterProps export');
  assert.match(content, /export\s+const\s+DateFilter/, 'Expected DateFilter component export');
});

test('DateFilter renders modal shell with operator selector', () => {
  assert.match(
    content,
    /import\s+\{\s*Dialog,\s*DialogContent,\s*DialogDescription,\s*DialogFooter,\s*DialogHeader,\s*DialogTitle\s*\}\s+from '@\/components\/ui\/dialog'/,
    'Expected Shadcn dialog import'
  );
  assert.match(content, /<Dialog\s+open=\{open\}\s+onOpenChange=\{onOpenChange\}>/, 'Expected dialog wrapper');
  assert.match(content, /data-testid="date-filter-modal"/, 'Expected modal test id');
  assert.match(content, /data-testid="date-filter-operator"/, 'Expected operator select test id');
  assert.match(content, /(OPERATOR_OPTIONS|operators)\.map/, 'Expected operator options iteration');
});

test('DateFilter implements preset panel and calendar', () => {
  assert.match(content, /data-testid="date-filter-presets"/, 'Expected presets container');
  assert.match(content, /onPresetSelect/, 'Expected preset handler prop');
  assert.match(content, /import\s+\{\s*Calendar\s*\}\s+from '@\/components\/ui\/calendar'/, 'Expected Calendar import');
  assert.match(content, /selectedRange/, 'Expected selected range state');
  assert.match(content, /onRangeChange/, 'Expected range change handler prop');
});

test('DateFilter exposes apply footer and formatting', () => {
  assert.match(content, /formatRangeLabel/, 'Expected helper for display formatting');
  assert.match(content, /data-testid="date-filter-apply"/, 'Expected apply button');
  assert.match(content, /onApply/, 'Expected onApply handler prop');
  assert.match(content, /Button variant="outline"/, 'Expected cancel button styling');
});
