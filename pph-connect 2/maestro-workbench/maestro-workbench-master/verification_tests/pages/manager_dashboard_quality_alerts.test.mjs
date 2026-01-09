import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const panelPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'manager', 'QualityAlertsPanel.tsx'),
    path.join(process.cwd(), 'src', 'components', 'manager', 'QualityAlertsPanel.tsx'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Unable to locate QualityAlertsPanel.tsx');
  }
  return match;
})();

const dashboardPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'Dashboard.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'Dashboard.tsx'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Unable to locate manager Dashboard.tsx');
  }
  return match;
})();

test('QualityAlertsPanel exports component with required test ids', () => {
  const content = readFileSync(panelPath, 'utf8');
  assert.match(content, /export\s+const\s+QualityAlertsPanel/, 'Expected panel export');
  assert.match(content, /data-testid="manager-quality-alerts"/, 'Expected root data-testid');
  assert.match(content, /data-testid="manager-quality-alerts-list"/, 'Expected list data-testid');
});

test('Manager dashboard renders QualityAlertsPanel', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /import\s+QualityAlertsPanel\s+from\s+'@\/components\/manager\/QualityAlertsPanel';/,
    'Expected dashboard import'
  );
  assert.match(
    content,
    /<QualityAlertsPanel\b/,
    'Expected dashboard to render QualityAlertsPanel'
  );
});
