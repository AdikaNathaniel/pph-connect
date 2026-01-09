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

test('WorkerForm configures react-hook-form for blur validation', () => {
  assert.match(content, /useForm<WorkerFormSchema>\(\{\s*resolver: zodResolver\(workerFormSchema\),/, 'Expected zod resolver configuration');
  assert.match(content, /mode:\s*'onBlur'/, 'Expected validation mode to run on blur');
  assert.match(content, /reValidateMode:\s*'onChange'/, 'Expected revalidate on change configuration');
});

test('WorkerForm performs Supabase uniqueness checks for key fields', () => {
  assert.match(
    content,
    /import\s+\{\s*supabase\s*\}\s+from\s+'@\/integrations\/supabase\/client'/,
    'Expected Supabase client import'
  );
  assert.match(
    content,
    /const\s+UNIQUE_FIELD_TO_COLUMN[^=]*=\s*\{\s*['"]?hrId['"]?:\s*'hr_id',\s*['"]?emailPersonal['"]?:\s*'email_personal',\s*['"]?emailPph['"]?:\s*'email_pph'\s*\}/,
    'Expected column map for uniqueness checks'
  );
  assert.match(
    content,
    /const\s+runUniqueCheck\s*=\s*useCallback\(\s*async\s*\(\s*fieldName:\s*'hrId'\s*\|\s*'emailPersonal'\s*\|\s*'emailPph',\s*rawValue:\s*string/,
    'Expected runUniqueCheck helper definition'
  );
  assert.match(
    content,
    /supabase\s*\.\s*from\('workers'\)\s*\.\s*select\('id'\)/,
    'Expected Supabase select query for worker uniqueness'
  );
  assert.match(
    content,
    /\.eq\(\s*UNIQUE_FIELD_TO_COLUMN\[fieldName\],\s*trimmedValue\s*\)/,
    'Expected equality filter on mapped column'
  );
  assert.match(
    content,
    /\.neq\('id',\s*currentWorkerId\)/,
    'Expected exclusion of current worker record during update'
  );
  assert.match(
    content,
    /form\.setError\(fieldName,\s*\{\s*type:\s*'validate',/,
    'Expected setError call when uniqueness fails'
  );
  assert.match(
    content,
    /onBlur=\{async\s*\(event\)\s*=>\s*\{\s*field\.onBlur\(\);\s*await runUniqueCheck\('hrId',\s*event\.target\.value\);/,
    'Expected HR ID input to trigger unique check on blur'
  );
  assert.match(
    content,
    /await runUniqueCheck\('emailPersonal',\s*event\.target\.value\);/,
    'Expected personal email blur handler to trigger unique check'
  );
  assert.match(
    content,
    /await runUniqueCheck\('emailPph',\s*event\.target\.value\);/,
    'Expected PPH email blur handler to trigger unique check'
  );
});
