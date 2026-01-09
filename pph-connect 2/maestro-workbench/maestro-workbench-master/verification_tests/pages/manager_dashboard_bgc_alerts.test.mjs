import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const hookPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'hooks', 'useBGCAlerts.ts'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'hooks', 'useBGCAlerts.ts')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate useBGCAlerts.ts');
  }
  return match;
})();

const hookContent = readFileSync(hookPath, 'utf8');

const dashboardPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'Dashboard.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'Dashboard.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate manager Dashboard.tsx');
  }
  return match;
})();

const dashboardContent = readFileSync(dashboardPath, 'utf8');

test('useBGCAlerts hook queries expiring and expired background checks', () => {
  assert.match(hookContent, /export\s+const\s+useBGCAlerts/, 'Expected useBGCAlerts export');
  assert.match(
    hookContent,
    /supabase\s*\.\s*from\('workers'\)/,
    'Expected workers table query'
  );
  assert.match(
    hookContent,
    /select\(\s*'id,\s*full_name,\s*hr_id,\s*bgc_expiration_date'\s*\)/,
    'Expected workers columns selection'
  );
  assert.match(
    hookContent,
    /gte\(\s*'bgc_expiration_date'/,
    'Expected lower bound filter for expiring soon range'
  );
  assert.match(
    hookContent,
    /lte\(\s*'bgc_expiration_date'/,
    'Expected upper bound filter for expiring soon range'
  );
  assert.match(
    hookContent,
    /lt\(\s*'bgc_expiration_date'/,
    'Expected expired filter for dates earlier than today'
  );
});


test('Dashboard BGC alert card renders sections, styling, and view links', () => {
  assert.match(dashboardContent, /Background Checks/, 'Expected Background Checks card title');
  assert.match(dashboardContent, /Expiring \(30 days\)/, 'Expected expiring soon section header');
  assert.match(
    dashboardContent,
    /No background checks expiring in the next 30 days/,
    'Expected expiring empty state copy'
  );
  assert.match(
    dashboardContent,
    /No workers with expired background checks/,
    'Expected expired empty state copy'
  );
  assert.match(dashboardContent, /HR #\{alert\.hrId\}/, 'Expected HR identifier display');
  assert.match(
    dashboardContent,
    /to=\{\`\/m\/workers\/\$\{alert\.id\}\`\}/,
    'Expected View link to worker detail'
  );
  assert.match(
    dashboardContent,
    /Unable to load background check alerts\./,
    'Expected dashboard to surface error copy'
  );
  assert.match(dashboardContent, /text-amber-500/, 'Expected warning color styling');
  assert.match(dashboardContent, /text-destructive/, 'Expected destructive styling for expired alerts');
});
