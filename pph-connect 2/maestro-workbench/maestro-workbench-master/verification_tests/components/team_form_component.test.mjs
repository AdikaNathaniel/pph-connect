import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const componentPath = resolvePath(['src', 'components', 'team', 'TeamForm.tsx']);
const typesPath = resolvePath(['src', 'types', 'app.ts']);

test('TeamForm component exports expected contract', () => {
  assert.ok(existsSync(componentPath), 'Expected TeamForm.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+TeamFormProps\b/, 'Expected TeamFormProps interface export');
  assert.match(content, /export\s+const\s+TeamForm\b/, 'Expected named TeamForm export');
  assert.match(content, /export\s+default\s+TeamForm\b/, 'Expected default TeamForm export');
  assert.match(content, /import\s+\{\s*useForm\s*\}\s+from\s+'react-hook-form';/, 'Expected react-hook-form integration');
  assert.match(
    content,
    /const\s+teamFormSchema\s*=\s*z\.object/,
    'Expected Zod schema definition for validation'
  );
  assert.match(
    content,
    /teamFormSchema\.parse/,
    'Expected schema parsing to validate submissions'
  );
});

test('TeamForm renders required fields and error messages', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /data-testid="team-form-name"/, 'Expected team name input test id');
  assert.match(content, /data-testid="team-form-department"/, 'Expected department select test id');
  assert.match(content, /data-testid="team-form-locale-primary"/, 'Expected primary locale select test id');
  assert.match(content, /data-testid="team-form-locale-secondary"/, 'Expected secondary locale select test id');
  assert.match(content, /data-testid="team-form-region"/, 'Expected region select test id');
  assert.match(content, /data-testid="team-form-active"/, 'Expected active checkbox test id');
  assert.match(content, /formState\.errors\.name/, 'Expected name validation error handling');
  assert.match(content, /formState\.errors\.departmentId/, 'Expected department validation error handling');
  assert.match(content, /formState\.errors\.localePrimary/, 'Expected primary locale validation error handling');
  assert.match(
    content,
    /(Button|button)[^>]*data-testid="team-form-submit"/,
    'Expected submit button test id'
  );
});

test('TeamForm supports create and update modes', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /mode:\s*['"]?(create|update)['"]?(?:\s*\|\s*['"]?(create|update)['"]?)?/,
    'Expected TeamFormProps to accept mode flag'
  );
  assert.match(content, /initialValues\??:/, 'Expected optional initial values for edit mode');
  assert.match(content, /defaultValues:/, 'Expected default values for create mode');
  assert.match(content, /onSubmit\(/, 'Expected submit handler callback');
});

test('TeamForm surfaces summary toast on submission failure', () => {
  const content = readFileSync(componentPath, 'utf8');
  assert.match(
    content,
    /import\s+\{\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected TeamForm to import toast helpers'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save team',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected showErrorToast usage for submission failure'
  );
});

test('TeamForm normalizes errors before presenting toast feedback', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*normalizeError,\s*toUserFacingMessage\s*\}\s+from\s+'@\/lib\/errors';/,
    'Expected TeamForm to import shared error normalization helpers'
  );
  assert.match(
    content,
    /const\s+normalized\s*=\s*normalizeError\(error\);/,
    'Expected TeamForm to normalize caught errors'
  );
  assert.match(
    content,
    /const\s+message\s*=\s*toUserFacingMessage\(normalized\);/,
    'Expected TeamForm to map normalized errors to user-facing messages'
  );
  assert.match(
    content,
    /console\.error\('Failed to submit team form',\s*error\);/,
    'Expected TeamForm to log submission failures for debugging'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save team',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected TeamForm toast utility to leverage normalized error description'
  );
});

test('TeamFormValues type supports team form fields', () => {
  assert.ok(existsSync(typesPath), 'Expected app types file to exist');
  const content = readFileSync(typesPath, 'utf8');

  assert.match(
    content,
    /export\s+type\s+TeamFormValues\s*=\s*\{/,
    'Expected TeamFormValues type definition'
  );
  assert.match(content, /name:\s*string;/, 'Expected name field in TeamFormValues');
  assert.match(content, /departmentId:\s*string;/, 'Expected departmentId field in TeamFormValues');
  assert.match(content, /localePrimary:\s*string;/, 'Expected localePrimary field in TeamFormValues');
  assert.match(content, /localeSecondary\?:\s*string\s*\|\s*null;/, 'Expected optional localeSecondary field');
  assert.match(content, /region\?:\s*string\s*\|\s*null;/, 'Expected optional region field');
  assert.match(content, /isActive:\s*boolean;/, 'Expected isActive field');
});
