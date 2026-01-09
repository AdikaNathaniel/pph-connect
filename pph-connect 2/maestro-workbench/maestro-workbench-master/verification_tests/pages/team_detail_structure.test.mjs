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

const appPath = resolvePath(['src', 'App.tsx']);
const pagePath = resolvePath(['src', 'pages', 'manager', 'TeamDetail.tsx']);

test('TeamDetail page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected TeamDetail.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /export\s+const\s+TeamDetail\b/, 'Expected named TeamDetail export');
  assert.match(content, /export\s+default\s+TeamDetail\b/, 'Expected default TeamDetail export');
  assert.match(
    content,
    /import\s+{?\s*PageErrorBoundary\s*}?\s+from\s+'@\/components\/errors\/PageErrorBoundary';/,
    'Expected PageErrorBoundary import'
  );
});

test('App mounts TeamDetail for /m/teams/:id', () => {
  const content = readFileSync(appPath, 'utf8');

  assert.match(
    content,
    /import\s+TeamDetail\s+from\s+"\.\/pages\/manager\/TeamDetail";/,
    'Expected TeamDetail import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/teams\/:id"\s+element=\{\s*<ProtectedRoute[^>]*>\s*<ManagerLayout[^>]*pageTitle="Team Detail"[^>]*breadcrumbs=\{\s*\[\s*\{\s*label:\s*"Teams",\s*href:\s*"\/m\/teams"\s*\},\s*\{\s*label:\s*"Team Detail",\s*current:\s*true\s*\}\s*\]\s*\}[^>]*>\s*<TeamDetail\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/teams/:id route configuration'
  );
});

test('TeamDetail renders header with breadcrumb, title, and edit action', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /useParams/, 'Expected useParams for team id');
  assert.match(content, /useEffect/, 'Expected effect to fetch team data');
  assert.match(content, /data-testid="team-detail-breadcrumb"/, 'Expected breadcrumb test id');
  assert.match(content, /data-testid="team-detail-title"/, 'Expected title test id');
  assert.match(content, /data-testid="team-detail-actions"/, 'Expected actions container');
  assert.match(content, /Edit Team/, 'Expected Edit Team button');
});

test('TeamDetail displays info card with team metadata and active toggle', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="team-detail-info"/, 'Expected info card test id');
  assert.match(content, /data-testid="team-detail-info-department"/, 'Expected department test id');
  assert.match(content, /data-testid="team-detail-info-locale-primary"/, 'Expected locale primary test id');
  assert.match(content, /data-testid="team-detail-info-locale-secondary"/, 'Expected locale secondary test id');
  assert.match(content, /data-testid="team-detail-info-region"/, 'Expected region test id');
  assert.match(content, /data-testid="team-detail-info-status"/, 'Expected status test id');
  assert.match(content, /Switch/, 'Expected active status switch');
});

test('TeamDetail renders related projects section', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="team-detail-projects"/, 'Expected projects section test id');
  assert.match(content, /Project Code/, 'Expected project code column');
  assert.match(content, /Project Name/, 'Expected project name column');
  assert.match(content, /Status/, 'Expected project status column');
  assert.match(content, /data-testid="team-detail-projects-empty"/, 'Expected projects empty state');
  assert.match(content, /<PageErrorBoundary[^>]*>/, 'Expected PageErrorBoundary wrapper for projects');
});

test('TeamDetail renders related workers section', () => {
  const content = readFileSync(pagePath, 'utf8');

  assert.match(content, /data-testid="team-detail-workers"/, 'Expected workers section test id');
  assert.match(content, /Worker/, 'Expected worker column');
  assert.match(content, /Project/, 'Expected project column');
  assert.match(content, /Assigned Date/, 'Expected assigned date column');
  assert.match(content, /data-testid="team-detail-workers-empty"/, 'Expected workers empty state');
  assert.match(content, /uniqueWorkers\s*=/, 'Expected uniqueness logic for workers');
  assert.match(content, /<PageErrorBoundary[^>]*>/, 'Expected PageErrorBoundary wrapper for workers');
});
