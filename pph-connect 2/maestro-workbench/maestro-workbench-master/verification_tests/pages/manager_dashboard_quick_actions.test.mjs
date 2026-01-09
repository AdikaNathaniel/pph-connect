import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dashboardPath = (() => {
  const candidatePaths = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'Dashboard.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'Dashboard.tsx')
  ];
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate manager Dashboard.tsx');
  }
  return match;
})();

const configPath = (() => {
  const candidatePaths = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'config', 'quickActions.ts'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'config', 'quickActions.ts')
  ];

  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate quickActions.ts');
  }
  return match;
})();

const dashboardContent = readFileSync(dashboardPath, 'utf8');
const configContent = readFileSync(configPath, 'utf8');

test('Quick actions config defines required CTAs', () => {
  assert.match(configContent, /Add Worker/, 'Expected Add Worker quick action label');
  assert.match(configContent, /href:\s*'\/m\/workers\?view=invite'/, 'Expected Add Worker link');
  assert.match(configContent, /Add Project/, 'Expected Add Project quick action label');
  assert.match(configContent, /href:\s*'\/m\/projects\/new'/, 'Expected Add Project link');
  assert.match(configContent, /Bulk Upload Workers/, 'Expected Bulk Upload quick action label');
  assert.match(configContent, /href:\s*'\/m\/workers\/bulk-upload'/, 'Expected Bulk Upload link');
  assert.match(configContent, /variant:\s*'primary'/, 'Expected primary variants defined');
});

test('Dashboard renders quick actions using config', () => {
  assert.match(
    dashboardContent,
    /import\s+\{\s*QUICK_ACTION_CONFIG\s*\}\s+from\s+'\.\/config\/quickActions'/,
    'Expected quick actions config import'
  );
  assert.match(
    dashboardContent,
    /QUICK_ACTION_CONFIG\.map/,
    'Expected quick actions config mapping within dashboard'
  );
  assert.match(
    dashboardContent,
    /variant=\{buttonVariant\}/,
    'Expected quick actions to compute button variant'
  );
  assert.match(
    dashboardContent,
    /<Link\s+to=\{action\.href\}/,
    'Expected quick actions to use Link for navigation'
  );
});
