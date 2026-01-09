import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const tablePath = resolvePath(['src', 'pages', 'manager', 'ProjectsTable.tsx']);
const pagePath = resolvePath(['src', 'pages', 'manager', 'ProjectsPage.tsx']);

test('ProjectsTable defines filter types and applies client-side filtering', () => {
  assert.ok(existsSync(tablePath), 'Expected ProjectsTable.tsx to exist');
  const content = readFileSync(tablePath, 'utf8');

  assert.match(
    content,
    /export\s+type\s+ProjectsTableFilters\s*=\s*\{/,
    'Expected ProjectsTableFilters type export'
  );
  assert.match(
    content,
    /expertTiers\?:\s*string\[\];/,
    'Expected expert tier filter list in ProjectsTableFilters'
  );
  assert.match(
    content,
    /const\s+normalizeFilterValues\s*=\s*\(values\?:\s*string\[\]\)\s*=>/,
    'Expected helper to normalize filter values'
  );
  assert.match(
    content,
    /const\s+matchesStringFilter\s*=\s*\(value:\s*string\s*\|\s*null\s*\|\s*undefined,\s*allowed:\s*string\[\]\)\s*=>/,
    'Expected helper to evaluate string filters'
  );
  assert.match(
    content,
    /const\s+filteredData\s*=\s*useMemo\(/,
    'Expected memoized filtered dataset'
  );
  assert.match(
    content,
    /const\s+expertTiers\s*=\s*normalizeFilterValues\(filters\.expertTiers\)/,
    'Expected ProjectsTable to normalize expert tier filters'
  );
  assert.match(
    content,
    /return\s+memoizedData\.filter/,
    'Expected filtering logic to reduce dataset'
  );
  assert.match(
    content,
    /if\s*\(!matchesStringFilter\(\s*row\.expert_tier(?:\s*\?\?\s*null)?\s*,\s*expertTiers\s*\)\)\s*\{\s*return\s*false;\s*\}/,
    'Expected ProjectsTable to filter by expert tier when provided'
  );
  assert.match(
    content,
    /const\s+effectiveRows\s*=\s*filteredData/,
    'Expected table to derive rows from filtered dataset'
  );
});

test('ProjectsPage derives filter state and passes to ProjectsTable', () => {
  assert.ok(existsSync(pagePath), 'Expected ProjectsPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');

  assert.match(
    content,
    /const\s+\[activeFilters,\s*setActiveFilters\]\s*=\s*useState/,
    'Expected ProjectsPage to track active filters'
  );
  assert.match(
    content,
    /const\s+tableFilters\s*=\s*useMemo/,
    'Expected ProjectsPage to memoize filters payload'
  );
  assert.match(
    content,
    /\{\s*value:\s*'dept-ai',\s*label:\s*'AI Services'\s*\}/,
    'Expected department filter option to use department id values'
  );
  assert.match(
    content,
    /\{\s*value:\s*'dept-ops',\s*label:\s*'Operations'\s*\}/,
    'Expected department filter option to include operations department id'
  );
  assert.match(
    content,
    /\{\s*value:\s*'team-data',\s*label:\s*'Data Labeling'\s*\}/,
    'Expected team filter option to include Data Labeling team id'
  );
  assert.match(
    content,
    /\{\s*value:\s*'team-qa',\s*label:\s*'Quality Assurance'\s*\}/,
    'Expected team filter option to include QA team id'
  );
  assert.match(
    content,
    /\{\s*value:\s*'team-support',\s*label:\s*'Support Ops'\s*\}/,
    'Expected team filter option to include Support Ops team id'
  );
  assert.match(
    content,
    /expertTiers:\s*tierFilter\s*===\s*'all'\s*\?\s*\[\]\s*:\s*\[tierFilter\]/,
    'Expected ProjectsPage to include tier filter in tableFilters payload'
  );
  assert.match(
    content,
    /<ProjectsTable[\s\S]*filters=\{tableFilters\}/,
    'Expected ProjectsPage to pass filters to ProjectsTable'
  );
});
