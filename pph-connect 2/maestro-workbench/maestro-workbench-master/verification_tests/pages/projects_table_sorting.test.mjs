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

test('ProjectsTable configures sorting helpers for sortable columns', () => {
  assert.ok(existsSync(tablePath), 'Expected ProjectsTable.tsx to exist');
  const content = readFileSync(tablePath, 'utf8');

  assert.match(content, /type\s+SortingState/, 'Expected SortingState import/usage');
  assert.match(
    content,
    /const\s+SortingIndicator\s*:\s*React\.FC/,
    'Expected SortingIndicator component definition'
  );
  assert.match(
    content,
    /const\s+sortableHeader\s*=\s*\(label:\s*string\)\s*=>/,
    'Expected sortableHeader helper'
  );
  assert.match(
    content,
    /columnHelper\.accessor\('project_code'[\s\S]*header:\s*sortableHeader\('Project Code'\)/,
    'Expected Project Code column to use sortable header'
  );
  assert.match(
    content,
    /columnHelper\.accessor\('project_name'[\s\S]*header:\s*sortableHeader\('Project Name'\)/,
    'Expected Project Name column to use sortable header'
  );
  assert.match(
    content,
    /columnHelper\.accessor\('start_date'[\s\S]*header:\s*sortableHeader\('Start Date'\)/,
    'Expected Start Date column to use sortable header'
  );
  assert.match(
    content,
    /columnHelper\.accessor\('end_date'[\s\S]*header:\s*sortableHeader\('End Date'\)/,
    'Expected End Date column to use sortable header'
  );
  assert.match(
    content,
    /columnHelper\.accessor\('worker_count'[\s\S]*header:\s*sortableHeader\('Worker Count'\)/,
    'Expected Worker Count column to use sortable header'
  );
  assert.match(
    content,
    /onClick=\{column\.getToggleSortingHandler\(\)\}/,
    'Expected sortable header button to toggle sorting'
  );
});
