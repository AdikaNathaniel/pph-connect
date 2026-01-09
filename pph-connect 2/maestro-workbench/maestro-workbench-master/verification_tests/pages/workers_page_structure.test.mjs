import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'WorkersPage.tsx'),
  path.join(process.cwd(), 'src', 'pages', 'manager', 'WorkersPage.tsx')
];

const workersPagePath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate WorkersPage.tsx');
  }
  return match;
})();

const content = readFileSync(workersPagePath, 'utf8');

test('WorkersPage exports component and default', () => {
  assert.match(content, /export\s+const\s+WorkersPage/, 'Expected named WorkersPage export');
  assert.match(content, /export\s+default\s+WorkersPage/, 'Expected default WorkersPage export');
});

test('WorkersPage defines layout shell with title and controls', () => {
  assert.match(content, /className="flex flex-col/, 'Expected flex column layout container');
  assert.match(content, /<h1[^>]*>Workers<\/h1>/, 'Expected Workers heading');
  assert.match(content, /data-testid="worker-count"/, 'Expected worker count placeholder');
  assert.match(content, /data-testid="workers-actions"/, 'Expected actions toolbar placeholder');
});

test('WorkersPage actions bar includes Add Worker and Bulk Upload buttons', () => {
  assert.match(content, /Bulk Upload/, 'Expected Bulk Upload button label');
  assert.match(content, /Add Worker/, 'Expected Add Worker button label');
  assert.match(content, /Button variant="outline" size="sm"/, 'Expected secondary button styling for bulk upload');
  assert.match(content, /Button size="sm"\s+onClick/, 'Expected primary button for add worker with click handler');
});

test('WorkersPage wires action buttons to dialogs', () => {
  assert.match(content, /useState\(/, 'Expected state hooks to manage dialog visibility');
  assert.match(content, /data-testid="add-worker-dialog"/, 'Expected add worker dialog wrapper');
  assert.match(
    content,
    /onClick=\{\(\)\s*=>\s*setShowBulkUpload\(true\)\}/,
    'Expected Bulk Upload button to open dialog'
  );
  assert.match(
    content,
    /onClick=\{\(\)\s*=>\s*setShowAddWorker\(true\)\}/,
    'Expected Add Worker button to open dialog'
  );
});

test('WorkersPage embeds BulkUploadModal for CSV imports', () => {
  assert.match(
    content,
    /import\s+\{\s*BulkUploadModal[^}]*\}\s+from\s+'@\/components\/worker\/BulkUploadModal'/,
    'Expected BulkUploadModal import'
  );
  assert.match(
    content,
    /<BulkUploadModal\s+open=\{showBulkUpload\}[\s\S]*onOpenChange=\{setShowBulkUpload\}/,
    'Expected BulkUploadModal usage with dialog state'
  );
});

test('WorkersPage renders debounced search controls', () => {
  assert.match(
    content,
    /import\s+\{\s*useWorkerSearch,\s*type\s*WorkerSearchFilters\s*\}\s+from\s+'\.\/hooks\/useWorkerSearch'/,
    'Expected useWorkerSearch import with filter types'
  );
  assert.match(content, /data-testid="workers-search"/, 'Expected search section test id');
  assert.match(content, /placeholder="Search workers"/, 'Expected search input placeholder');
  assert.match(content, /value=\{query\}/, 'Expected search input to bind query state');
  assert.match(content, /onChange=\{handleSearchChange\}/, 'Expected search input change handler');
  assert.match(content, /data-testid="clear-search"/, 'Expected clear search control');
  assert.match(content, /data-testid="search-results-count"/, 'Expected search results indicator');
  assert.match(content, /data-testid="searching-indicator"/, 'Expected loading state indicator');
  assert.match(
    content,
    /hasActiveFilters/,
    'Expected hasActiveFilters to influence search result messaging'
  );
});

test('WorkersPage syncs filters with URL params', () => {
  assert.match(content, /useSearchParams/, 'Expected useSearchParams import');
  assert.match(
    content,
    /const\s+\[searchParams,\s*setSearchParams\]\s*=\s*useSearchParams\(\)/,
    'Expected useSearchParams hook usage'
  );
  assert.match(
    content,
    /const\s+\[activeFilters,\s*setActiveFilters\]\s*=\s*useState<FilterBarFilter\[]\>\(\s*\(\)\s*=>\s*parseFiltersFromSearchParam\(searchParams\.get\('filters'\)\)\s*\)/,
    'Expected state initializer to hydrate filters from search params'
  );
  assert.match(
    content,
    /const\s+parseFiltersFromSearchParam\s*=/,
    'Expected helper to parse filters from param'
  );
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*const\s+parsedFilters\s*=\s*parseFiltersFromSearchParam\(searchParams\.get\('filters'\)\);\s*setActiveFilters/,
    'Expected effect to hydrate state when URL params change'
  );
  assert.match(
    content,
    /const\s+filtersAreEqual\s*=/,
    'Expected helper to compare filter lists'
  );
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*const\s+serialized\s*=\s*activeFilters\.length\s*\?\s*JSON\.stringify\(activeFilters\)\s*:\s*null;/,
    'Expected serialization effect for filter state'
  );
  assert.match(
    content,
    /const\s+currentValue\s*=\s*rawValue\s*&&\s*rawValue\.length\s*>\s*0\s*\?\s*rawValue\s*:\s*null;/,
    'Expected normalization of empty filter values'
  );
  assert.match(
    content,
    /next\.delete\('filters'\)/,
    'Expected deletion of filters param when no filters remain'
  );
  assert.match(
    content,
    /setSearchParams\(\s*next,\s*\{\s*replace:\s*true\s*\}\s*\)/,
    'Expected setSearchParams call with replace option'
  );
});

test('WorkersPage surfaces FilterBar for active filters', () => {
  assert.match(
    content,
    /import\s+\{\s*FilterBar,\s*type\s*FilterBarFilter\s*\}\s+from\s+'@\/components\/filters\/FilterBar'/,
    'Expected FilterBar import'
  );
  assert.match(
    content,
    /const\s+\{[^}]*setFilters[^}]*hasActiveFilters[^}]*\}\s*=\s*useWorkerSearch\(\)/,
    'Expected WorkersPage to access setFilters and hasActiveFilters from hook'
  );
  assert.match(
    content,
    /const\s+\[activeFilters,\s*setActiveFilters\]\s*=\s*useState<FilterBarFilter\[]\>\(/,
    'Expected activeFilters state initialization'
  );
  assert.match(
    content,
    /const\s+\[appliedFilters,\s*setAppliedFilters\]\s*=\s*useState<WorkerSearchFilters\>\(\s*\{\s*\}\s*\)/,
    'Expected WorkersPage to track applied filter values'
  );
  assert.match(
    content,
    /const\s+FILTER_TO_SEARCH_KEY[^=]*=\s*\{\s*['"]status['"]:\s*'statuses',\s*['"]country['"]:\s*'countries',\s*['"]locale['"]:\s*'locales'\s*\}/,
    'Expected mapping from filter ids to worker search keys'
  );
  assert.match(content, /const\s+handleAddFilter\s*=\s*useCallback/, 'Expected handleAddFilter callback');
  assert.match(content, /const\s+handleClearFilters\s*=\s*useCallback/, 'Expected handleClearFilters callback');
  assert.match(content, /const\s+handleRemoveFilter\s*=\s*useCallback/, 'Expected handleRemoveFilter callback');
  assert.match(content, /const\s+handleFilterClick\s*=\s*useCallback/, 'Expected handleFilterClick callback');
  assert.match(
    content,
    /<FilterBar[^>]*filters=\{activeFilters\}[^>]*onAddFilter=\{handleAddFilter\}[^>]*onClearAll=\{handleClearFilters\}[^>]*onRemoveFilter=\{handleRemoveFilter\}[^>]*onFilterClick=\{handleFilterClick\}/s,
    'Expected FilterBar usage with handlers'
  );
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*setFilters\(\s*appliedFilters\s*\);\s*\}\s*,\s*\[appliedFilters,\s*setFilters\]\s*\)/,
    'Expected effect to sync applied filters to worker search'
  );
  assert.match(
    content,
    /handleClearFilters[\s\S]*setAppliedFilters\(\{\}\)/,
    'Expected clearing filters to reset applied filter values'
  );
  assert.match(
    content,
    /handleRemoveFilter[\s\S]*const\s+keyToRemove\s*=\s*FILTER_TO_SEARCH_KEY\[filterId\];[\s\S]*setAppliedFilters\([\s\S]*=>\s*\{[\s\S]*delete\s+next\[keyToRemove\];/,
    'Expected removing a filter to update applied filter values via mapping'
  );
});
