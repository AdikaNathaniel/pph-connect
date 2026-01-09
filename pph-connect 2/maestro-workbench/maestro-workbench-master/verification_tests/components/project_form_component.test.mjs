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

const componentPath = resolvePath(['src', 'components', 'project', 'ProjectForm.tsx']);
const typesPath = resolvePath(['src', 'types', 'app.ts']);

test('ProjectForm component exports expected contract', () => {
  assert.ok(existsSync(componentPath), 'Expected ProjectForm.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+ProjectFormProps\b/, 'Expected ProjectFormProps interface export');
  assert.match(content, /export\s+const\s+ProjectForm\b/, 'Expected named ProjectForm export');
  assert.match(content, /export\s+default\s+ProjectForm\b/, 'Expected default ProjectForm export');
  assert.match(content, /import\s+\{\s*useForm\s*\}\s+from\s+'react-hook-form';/, 'Expected react-hook-form integration');
  assert.match(
    content,
    /const\s+projectFormSchema\s*=\s*z\.object/,
    'Expected Zod schema definition for validation'
  );
  assert.match(
    content,
    /projectFormSchema\.parse/,
    'Expected schema parsing to validate submissions'
  );
});

test('ProjectForm renders required fields and error messages', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /data-testid="project-form-code"/, 'Expected project code input test id');
  assert.match(content, /data-testid="project-form-name"/, 'Expected project name input test id');
  assert.match(content, /data-testid="project-form-department"/, 'Expected department select test id');
  assert.match(content, /data-testid="project-form-status"/, 'Expected status select test id');
  assert.match(content, /data-testid="project-form-tier"/, 'Expected expert tier select test id');
  assert.match(content, /data-testid="project-form-start-date"/, 'Expected start date input test id');
  assert.match(content, /data-testid="project-form-end-date"/, 'Expected end date input test id');
  assert.match(content, /formState\.errors\.code/, 'Expected code validation error handling');
  assert.match(content, /formState\.errors\.name/, 'Expected name validation error handling');
  assert.match(content, /formState\.errors\.status/, 'Expected status validation error handling');
});

test('ProjectForm supports create and update modes', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /mode:\s*['"]?(create|update)['"]?(?:\s*\|\s*['"]?(create|update)['"]?)?/,
    'Expected ProjectFormProps to accept mode flag'
  );
  assert.match(
    content,
    /(Button|button)[^>]*data-testid="project-form-submit"/,
    'Expected submit button with test id'
  );
  assert.match(
    content,
    /initialValues\s*\?/,
    'Expected optional initial values for edit mode'
  );
  assert.match(
    content,
    /onSubmit\(/,
    'Expected submit handler callback'
  );

  assert.match(
    content,
    /import\s+\{\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helpers import when submission fails'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save project',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected showErrorToast usage when submission fails'
  );
});

test('ProjectForm normalizes errors before surfacing toast feedback', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*normalizeError,\s*toUserFacingMessage\s*\}\s+from\s+'@\/lib\/errors';/,
    'Expected ProjectForm to import error normalization utilities'
  );
  assert.match(
    content,
    /const\s+normalized\s*=\s*normalizeError\(error\);/,
    'Expected ProjectForm to normalize caught errors'
  );
  assert.match(
    content,
    /const\s+message\s*=\s*toUserFacingMessage\(normalized\);/,
    'Expected ProjectForm to derive a user-facing error description'
  );
  assert.match(
    content,
    /console\.error\('Failed to submit project form',\s*error\);/,
    'Expected ProjectForm to log submission failures for debugging'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save project',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected ProjectForm toast utility to reuse normalized user-facing description'
  );
});

test('ProjectFormValues type supports project form fields', () => {
  assert.ok(existsSync(typesPath), 'Expected app types file to exist');
  const content = readFileSync(typesPath, 'utf8');

  assert.match(
    content,
    /export\s+type\s+ProjectFormValues\s*=\s*\{/,
    'Expected ProjectFormValues type definition'
  );
  assert.match(content, /code:\s*string;/, 'Expected code field in ProjectFormValues');
  assert.match(content, /name:\s*string;/, 'Expected name field in ProjectFormValues');
  assert.match(content, /status:\s*ProjectStatus;/, 'Expected status field in ProjectFormValues');
  assert.match(content, /departmentId\?:\s*string\s*\|\s*null;/, 'Expected department field in ProjectFormValues');
  assert.match(content, /expertTier\?:/, 'Expected expert tier field');
  assert.match(content, /startDate\?:\s*string\s*\|\s*null;/, 'Expected start date field');
  assert.match(content, /endDate\?:\s*string\s*\|\s*null;/, 'Expected end date field');
});
