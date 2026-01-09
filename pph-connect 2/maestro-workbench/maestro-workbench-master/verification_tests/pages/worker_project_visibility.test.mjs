import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const panelPath = resolvePath('src', 'components', 'worker', 'ProjectVisibilityPanel.tsx');
const dashboardPath = resolvePath('src', 'pages', 'worker', 'Dashboard.tsx');

test('ProjectVisibilityPanel exports component contract', () => {
  assert.ok(existsSync(panelPath), 'Expected ProjectVisibilityPanel.tsx to exist');
  const content = readFileSync(panelPath, 'utf8');
  assert.match(content, /export\s+const\s+ProjectVisibilityPanel\b/, 'Expected named ProjectVisibilityPanel export');
  assert.match(content, /export\s+default\s+ProjectVisibilityPanel\b/, 'Expected default export');
  [
    'data-testid="worker-visibility-panel"',
    'data-testid="worker-visibility-available"',
    'data-testid="worker-visibility-locked"'
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} marker`);
  });
});

test('ProjectVisibilityPanel fetches data from accessService', () => {
  const content = readFileSync(panelPath, 'utf8');
  assert.match(
    content,
    /import\s*\{\s*getAvailableProjects[\s\S]*\}\s*from\s+'@\/services\/accessService';/,
    'Expected getAvailableProjects import'
  );
  assert.match(
    content,
    /import\s*\{\s*triggerQualityWarning\s*\}\s*from\s+'@\/services\/qualityWarningService';/,
    'Expected triggerQualityWarning import'
  );
  assert.match(content, /useEffect/, 'Expected useEffect hook for data loading');
});

test('WorkerDashboard renders project visibility panel', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /import\s+ProjectVisibilityPanel\s+from\s+'@\/components\/worker\/ProjectVisibilityPanel';/,
    'Expected ProjectVisibilityPanel import in dashboard'
  );
  assert.match(
    content,
    /<ProjectVisibilityPanel\s+workerId=\{user(?:\?\.)?\.id\}\s*\/>/,
    'Expected ProjectVisibilityPanel rendered with worker id'
  );
});

test('ProjectVisibilityPanel surfaces qualification requirements and reason strings', () => {
  const content = readFileSync(panelPath, 'utf8');
  assert.match(content, /requiredQualifications/, 'Expected requiredQualifications field usage');
  assert.match(content, /missing_qualifications/, 'Expected missing qualifications reason handling');
  assert.match(content, /qualification_expired/, 'Expected expired qualification reason handling');
  assert.match(content, /Qualifications required:/, 'Expected UI text explaining qualification requirements');
  assert.match(content, /Renew qualification/, 'Expected copy guiding renewal action');
});
