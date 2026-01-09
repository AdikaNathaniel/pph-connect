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

const componentPath = resolvePath(['src', 'components', 'department', 'DepartmentForm.tsx']);
const typesPath = resolvePath(['src', 'types', 'app.ts']);

test('DepartmentForm exports expected contract', () => {
  assert.ok(existsSync(componentPath), 'Expected DepartmentForm.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+DepartmentFormProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+DepartmentForm\b/, 'Expected named DepartmentForm export');
  assert.match(content, /export\s+default\s+DepartmentForm\b/, 'Expected default DepartmentForm export');
  assert.match(content, /import\s+\{\s*useForm\s*\}\s+from\s+'react-hook-form';/, 'Expected react-hook-form usage');
  assert.match(content, /const\s+departmentFormSchema\s*=\s*z\.object/, 'Expected Zod schema definition');
  assert.match(content, /departmentFormSchema\.parse/, 'Expected schema parse invocation');
});

test('DepartmentForm renders required fields and handles errors', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /data-testid="department-form-name"/, 'Expected department name input');
  assert.match(content, /data-testid="department-form-code"/, 'Expected department code input');
  assert.match(content, /data-testid="department-form-active"/, 'Expected active checkbox');
  assert.match(content, /formState\.errors\.name/, 'Expected name validation errors');
  assert.match(content, /formState\.errors\.code/, 'Expected code validation errors');
  assert.match(
    content,
    /(Button|button)[^>]*data-testid="department-form-submit"/,
    'Expected submit button test id'
  );
  assert.match(content, /immutable message/i, 'Expected immutability guidance for department code');
});

test('DepartmentForm surfaces summary toast on submission failure', () => {
  const content = readFileSync(componentPath, 'utf8');
  assert.match(
    content,
    /import\s+\{\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected DepartmentForm to import toast helpers'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save department',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected showErrorToast to surface submission failure'
  );
});

test('DepartmentForm normalizes errors before presenting toast feedback', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*normalizeError,\s*toUserFacingMessage\s*\}\s+from\s+'@\/lib\/errors';/,
    'Expected DepartmentForm to import shared error utilities'
  );
  assert.match(
    content,
    /const\s+normalized\s*=\s*normalizeError\(error\);/,
    'Expected DepartmentForm to normalize caught errors'
  );
  assert.match(
    content,
    /const\s+message\s*=\s*toUserFacingMessage\(normalized\);/,
    'Expected DepartmentForm to map normalized errors to user-friendly text'
  );
  assert.match(
    content,
    /console\.error\('Failed to submit department form',\s*error\);/,
    'Expected DepartmentForm to log submission failures for debugging'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save department',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected DepartmentForm toast utility to leverage normalized description'
  );
});

test('DepartmentForm supports create and update modes', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /mode:\s*['"]?(create|update)['"]?/, 'Expected mode flag in props');
  assert.match(content, /initialValues\??:/, 'Expected optional initial values');
  assert.match(content, /isCodeEditable/, 'Expected prop controlling code immutability');
  assert.match(content, /onSubmit\(/, 'Expected submit handler callback');
});

test('DepartmentFormValues type exists with required fields', () => {
  assert.ok(existsSync(typesPath), 'Expected app types file to exist');
  const content = readFileSync(typesPath, 'utf8');

  assert.match(content, /export\s+type\s+DepartmentFormValues\s*=\s*\{/, 'Expected DepartmentFormValues type definition');
  assert.match(content, /name:\s*string;/, 'Expected name field');
  assert.match(content, /code:\s*string;/, 'Expected code field');
  assert.match(content, /isActive:\s*boolean;/, 'Expected isActive field');
});
