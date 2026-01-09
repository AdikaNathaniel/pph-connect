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

test('ProjectsTable exports expected API surface', () => {
  assert.ok(existsSync(tablePath), 'Expected ProjectsTable.tsx to exist');
  const content = readFileSync(tablePath, 'utf8');
  assert.match(content, /export\s+type\s+ProjectRow\b/, 'Expected ProjectRow type export');
  assert.match(content, /export\s+interface\s+ProjectsTableProps\b/, 'Expected ProjectsTableProps interface export');
  assert.match(content, /export\s+const\s+ProjectsTable\b/, 'Expected named ProjectsTable export');
  assert.match(content, /export\s+default\s+ProjectsTable\b/, 'Expected default ProjectsTable export');
});

test('ProjectsTable defines required columns with clickable links and badges', () => {
  const content = readFileSync(tablePath, 'utf8');

  assert.match(content, /Project Code/, 'Expected Project Code column definition');
  assert.match(content, /Project Name/, 'Expected Project Name column definition');
  assert.match(content, /Department/, 'Expected Department column definition');
  assert.match(content, /Teams/, 'Expected Teams column definition');
  assert.match(content, /Status/, 'Expected Status column definition');
  assert.match(content, /Expert Tier/, 'Expected Expert Tier column definition');
  assert.match(content, /Start Date/, 'Expected Start Date column definition');
  assert.match(content, /End Date/, 'Expected End Date column definition');
  assert.match(content, /Worker Count/, 'Expected Worker Count column definition');
  assert.match(content, /Actions/, 'Expected Actions column definition');

  assert.match(
    content,
    /to=\{\s*`\/m\/projects\/\$\{row\.original\.id\}`\s*\}/,
    'Expected project links to detail route'
  );
  assert.match(
    content,
    /Badge[^>]+>\s*\{\s*row\.original\.status_label\s*\|\|\s*row\.original\.status(?:\s*\|\|\s*'Unknown')?\s*\}/,
    'Expected status badge usage'
  );
  assert.match(
    content,
    /Badge[^>]+variant="secondary"[^>]*>\s*\{\s*row\.original\.worker_count/,
    'Expected worker count badge usage'
  );
  assert.match(content, /DropdownMenuItem/, 'Expected dropdown menu items for actions');
});

test('ProjectsPage wires ProjectsTable with data and loading state', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(
    content,
    /import\s+ProjectsTable(?:\s*,\s*\{\s*type\s+ProjectRow\s*(?:,\s*type\s+ProjectsTableFilters\s*)?\}\s*)?\s+from\s+'\.\/ProjectsTable';/,
    'Expected ProjectsPage to import ProjectsTable'
  );
  assert.match(
    content,
    /const\s+\[projects,\s*setProjects\]\s*=\s*useState<ProjectsTableData>\(\{ rows:\s*\[\],\s*total:\s*0 \}\)/,
    'Expected ProjectsPage to manage projects state'
  );
  assert.match(
    content,
    /<ProjectsTable\s+data=\{projects\.rows\}\s+totalCount=\{projects\.total\}[\s\S]*isLoading=\{isLoading\}/,
    'Expected ProjectsPage to pass data, total count, and loading state to ProjectsTable'
  );
});
