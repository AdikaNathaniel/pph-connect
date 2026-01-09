import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'worker', 'WorkerForm.tsx'),
    path.join(process.cwd(), 'src', 'components', 'worker', 'WorkerForm.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate WorkerForm.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('WorkerForm exports schema, types, and component', () => {
  assert.match(content, /import\s+\{\s*useForm\s*\}\s+from\s+'react-hook-form'/, 'Expected useForm import');
  assert.match(content, /import\s+\{\s*z\s*\}\s+from\s+'zod'/, 'Expected zod import');
  assert.match(content, /import\s+\{\s*zodResolver\s*\}\s+from\s+'@hookform\/resolvers\/zod'/, 'Expected zod resolver import');
  assert.match(content, /export\s+const\s+workerFormSchema\b/, 'Expected workerFormSchema export');
  assert.match(content, /type\s+WorkerFormSchema\s*=\s*z\.infer<typeof workerFormSchema>/, 'Expected WorkerFormSchema alias');
  assert.match(content, /export\s+interface\s+WorkerFormProps\b/, 'Expected WorkerFormProps export');
  assert.match(content, /export\s+const\s+WorkerForm\b/, 'Expected WorkerForm component export');
});

test('WorkerForm renders responsive grid layout with required fields', () => {
  assert.match(
    content,
    /className="grid\s+grid-cols-1\s+gap-4\s+md:grid-cols-2\s+lg:grid-cols-3"/,
    'Expected responsive grid layout for form fields'
  );
  [
    'hrId',
    'fullName',
    'engagementModel',
    'workerRole',
    'emailPersonal',
    'emailPph',
    'countryResidence',
    'localePrimary',
    'localeAll',
    'hireDate',
    'rtwDateTime',
    'supervisorId',
    'terminationDate',
    'bgcExpirationDate',
    'status'
  ].forEach((fieldName) => {
    assert.match(
      content,
      new RegExp(`name="${fieldName}"`),
      `Expected FormField definition for ${fieldName}`
    );
  });
});

test('WorkerForm composes shared UI primitives for inputs and selects', () => {
  assert.match(content, /Form\s+\{\.\.\.form\}/, 'Expected Form provider usage');
  assert.match(content, /FormField/, 'Expected FormField usage');
  assert.match(content, /FormControl/, 'Expected FormControl usage');
  assert.match(content, /FormMessage/, 'Expected FormMessage usage');
  assert.match(content, /import\s+\{\s*Input\s*\}\s+from\s+'@\/components\/ui\/input'/, 'Expected Input import');
  assert.match(
    content,
    /import\s+\{\s*Select,\s*SelectContent,\s*SelectItem,\s*SelectTrigger,\s*SelectValue\s*\}\s+from\s+'@\/components\/ui\/select'/,
    'Expected Select primitives import'
  );
  assert.match(content, /data-testid="worker-form-submit"/, 'Expected submit button test id');
  assert.match(content, /FormField[^]*data-testid="worker-form-locale-all"/, 'Expected multi-select control for localeAll');
});

test('WorkerForm surfaces summary toast on submission failure', () => {
  assert.match(
    content,
    /import\s+\{\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper import on submission failure'
  );
  assert.match(
    content,
    /showErrorToast\('Unable to save worker',\s*\{\s*description:\s*message\s*\}\);/,
    'Expected showErrorToast usage on submission failure'
  );
});
