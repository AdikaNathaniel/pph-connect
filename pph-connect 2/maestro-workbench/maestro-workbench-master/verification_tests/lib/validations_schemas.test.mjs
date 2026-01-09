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

const validationsPath = resolvePath(['src', 'lib', 'validations', 'index.ts']);
const forms = [
  { name: 'worker', path: ['src', 'components', 'worker', 'WorkerForm.tsx'], schema: 'workerFormSchema' },
  { name: 'project', path: ['src', 'components', 'project', 'ProjectForm.tsx'], schema: 'projectFormSchema' },
  { name: 'team', path: ['src', 'components', 'team', 'TeamForm.tsx'], schema: 'teamFormSchema' },
  { name: 'department', path: ['src', 'components', 'department', 'DepartmentForm.tsx'], schema: 'departmentFormSchema' },
  { name: 'account', path: ['src', 'lib', 'validations', 'account.ts'], schema: 'accountSchema' }
];

test('validation index exports all domain schemas', () => {
  assert.ok(existsSync(validationsPath), 'Expected validations index to exist');
  const content = readFileSync(validationsPath, 'utf8');

  forms.forEach(({ name }) => {
    const pattern =
      name === 'account'
        ? /export\s*{\s*accountSchema\s*}/i
        : new RegExp(`export\\s*{[^}]*${name}FormSchema\\s+as\\s+${name}Schema`, 'i');
    assert.match(content, pattern, `Expected validations index to export ${name}Schema`);
  });
});

forms.forEach(({ name, path: filePath, schema }) => {
  test(`${name} form exposes ${schema}`, () => {
    const resolvedPath = resolvePath(filePath);
    assert.ok(existsSync(resolvedPath), `Expected ${schema} source file`);
    const content = readFileSync(resolvedPath, 'utf8');
    assert.match(content, new RegExp(`const\\s+${schema}\\s*=\\s*z\\.object`), `Expected ${schema} to be a Zod object`);
  });
});
