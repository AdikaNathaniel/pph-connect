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
const pagePath = resolvePath(['src', 'pages', 'manager', 'ProjectDetail.tsx']);

test('ProjectDetail page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected ProjectDetail.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ProjectDetail\b/, 'Expected named ProjectDetail export');
  assert.match(content, /export\s+default\s+ProjectDetail\b/, 'Expected default ProjectDetail export');
});

test('App mounts ProjectDetail for /m/projects/:id', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/ProjectDetail"\)\)/,
    'Expected lazy ProjectDetail import in App'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/projects\/:id"\s+element=\{\s*<ProtectedRoute[^>]*>\s*<ManagerLayout[^>]*pageTitle="Project Detail"[^>]*breadcrumbs=\{\s*\[\s*\{\s*label:\s*"Projects",\s*href:\s*"\/m\/projects"\s*\},\s*\{\s*label:\s*"Project Detail",\s*current:\s*true\s*\}\s*\]\s*\}[^>]*>\s*<ProjectDetail\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected route configuration for /m/projects/:id'
  );
});

test('ProjectDetail renders header with breadcrumb, title, status badge, and quick actions', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /useParams/, 'Expected useParams hook to read project id');
  assert.match(content, /useEffect/, 'Expected side effect to fetch project data');
  assert.match(content, /data-testid="project-detail-breadcrumb"/, 'Expected breadcrumb test id');
  assert.match(content, /data-testid="project-detail-title"/, 'Expected title test id');
  assert.match(content, /data-testid="project-detail-status"/, 'Expected status badge test id');
  assert.match(content, /data-testid="project-detail-actions"/, 'Expected quick actions container');
  assert.match(content, /data-testid="project-detail-action-edit"/, 'Expected edit action test id');
  assert.match(content, /data-testid="project-detail-action-assign-teams"/, 'Expected assign teams action test id');
  assert.match(content, /data-testid="project-detail-action-assign-workers"/, 'Expected assign workers action test id');
  assert.match(content, /Edit Project/, 'Expected Edit Project action');
  assert.match(content, /Assign Workers/, 'Expected Assign Workers action');
  assert.match(content, /Assign Teams/, 'Expected Assign Teams action');
});

test('ProjectDetail displays info card with project metadata', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="project-detail-info"/, 'Expected info section test id');
  assert.match(content, /data-testid="project-detail-info-department"/, 'Expected department info test id');
  assert.match(content, /data-testid="project-detail-info-tier"/, 'Expected tier info test id');
  assert.match(content, /data-testid="project-detail-info-status"/, 'Expected status info test id');
  assert.match(content, /data-testid="project-detail-info-start"/, 'Expected start date info test id');
  assert.match(content, /data-testid="project-detail-info-end"/, 'Expected end date info test id');
  assert.match(content, /data-testid="project-detail-info-description"/, 'Expected description info test id');
  assert.match(content, /data-testid="project-detail-info-qualifications"/, 'Expected qualifications info test id');
  assert.match(content, /Department/, 'Expected department field copy');
  assert.match(content, /Expert Tier/, 'Expected expert tier field');
  assert.match(content, /Start Date/, 'Expected start date label');
  assert.match(content, /End Date/, 'Expected end date label');
  assert.match(content, /Description/, 'Expected description label');
  assert.match(content, /Qualifications/, 'Expected qualifications label');
});

test('ProjectDetail lists required qualifications as chips/badges', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /requiredQualifications/, 'Expected local state or derived data for qualifications');
  assert.match(content, /requiredQualifications\.length/, 'Expected length check before rendering chips');
  assert.match(content, /Badge/, 'Expected badge component for each qualification');
});

test('ProjectDetail Teams tab renders table scaffolding and assign button', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /TabsList/, 'Expected tabs list in ProjectDetail');
  assert.match(content, /value="teams"/, 'Expected Teams tab value');
  assert.match(content, /data-testid="project-detail-teams"/, 'Expected teams section test id');
  assert.match(content, /data-testid="project-detail-teams-assign"/, 'Expected Assign Teams button test id');
  assert.match(
    content,
    /import\s+TeamForm\s+from\s+'@\/components\/team\/TeamForm';/,
    'Expected TeamForm import in ProjectDetail'
  );
  assert.match(
    content,
    /import\s+{?\s*PageErrorBoundary\s*}?\s+from\s+'@\/components\/errors\/PageErrorBoundary';/,
    'Expected PageErrorBoundary import in ProjectDetail'
  );
  assert.match(
    content,
    /teamFormProps:\s*\{\s*mode:\s*['"]create['"]/,
    'Expected ProjectDetail to derive TeamForm props for create mode'
  );
  assert.match(content, /Team Name/, 'Expected Team Name column header');
  assert.match(content, /Primary Locale/, 'Expected primary locale column header');
  assert.match(content, /Secondary Locale/, 'Expected secondary locale column header');
  assert.match(content, /Region/, 'Expected region column header');
  assert.match(content, /Assigned Date/, 'Expected assigned date column header');
  assert.match(content, /Actions/, 'Expected actions column header');
  assert.match(content, /data-testid="project-detail-teams-empty"/, 'Expected empty state sentinel');
  assert.match(
    content,
    /<PageErrorBoundary[^>]*>/,
    'Expected teams section to render within PageErrorBoundary'
  );
});

test('ProjectDetail Workers tab renders table scaffolding', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /value="workers"/, 'Expected workers tab value');
  assert.match(content, /data-testid="project-detail-workers"/, 'Expected workers tab test id');
  assert.match(content, /data-testid="project-detail-workers-assign"/, 'Expected Assign Workers button test id');
  assert.match(content, /HR ID/, 'Expected HR ID column header');
  assert.match(content, /Name/, 'Expected Name column header');
  assert.match(content, /Current Email/, 'Expected Current Email column header');
  assert.match(content, /Status/, 'Expected Status column header');
  assert.match(content, /Assigned Date/, 'Expected Assigned Date column header');
  assert.match(content, /Assigned By/, 'Expected Assigned By column header');
  assert.match(content, /Actions/, 'Expected actions column for workers');
  assert.match(content, /View Assignment History/, 'Expected history link text');
  assert.match(content, /data-testid="project-detail-workers-empty"/, 'Expected workers empty state');
});
