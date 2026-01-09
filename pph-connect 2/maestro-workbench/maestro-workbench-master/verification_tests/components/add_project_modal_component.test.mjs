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

const modalPath = resolvePath(['src', 'components', 'project', 'AddProjectModal.tsx']);

test('AddProjectModal exports component contract', () => {
  assert.ok(existsSync(modalPath), 'Expected AddProjectModal.tsx to exist');
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /export\s+interface\s+AddProjectModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+AddProjectModal\b/, 'Expected named modal export');
  assert.match(content, /export\s+default\s+AddProjectModal\b/, 'Expected default modal export');
  assert.match(content, /import\s+ProjectForm\s+from\s+'@\/components\/project\/ProjectForm';/, 'Expected ProjectForm embed');
  assert.match(content, /import\s+\{\s*supabase\s*\}\s+from\s+'@\/integrations\/supabase\/client';/, 'Expected supabase integration');
});

test('AddProjectModal renders ProjectForm and handles submission workflow', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /<ProjectForm\s+[^>]*mode="create"/, 'Expected ProjectForm in create mode');
  assert.match(
    content,
    /const\s+\[isSubmitting,\s*setIsSubmitting\]\s*=\s*useState\(false\)/,
    'Expected dedicated submission state'
  );
  assert.match(
    content,
    /import\s+\{\s*showSuccessToast,\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper imports for submission workflow'
  );
  assert.match(content, /showSuccessToast\(/, 'Expected success toast helper on submission');
  assert.match(content, /showErrorToast\(/, 'Expected error toast helper on failure');
  assert.match(
    content,
    /await\s+supabase\s*\.from\('projects'\)\s*\.insert/,
    'Expected supabase insert into projects table'
  );
  assert.match(
    content,
    /setIsSubmitting\(true\);/,
    'Expected modal to set submitting true before insert'
  );
  assert.match(
    content,
    /const\s+\{[^}]*error:\s*insertError[^}]*\}\s*=\s*await\s+supabase/,
    'Expected insert error handling'
  );
  assert.match(content, /onSuccess\?\.\(\)/, 'Expected optional success callback to refresh table');
  assert.match(
    content,
    /} finally \{\s*setIsSubmitting\(false\);/s,
    'Expected submission state reset in finally block'
  );
  assert.match(
    content,
    /isSubmitting=\{isSubmitting\s*\|\|\s*isLoading\}/,
    'Expected ProjectForm to receive submitting state'
  );
});

test('AddProjectModal links selected teams to new project', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(
    content,
    /const\s+\{\s*data:\s*projectRecord[^}]*error:\s*insertError[^}]*\}\s*=\s*await\s+supabase\s*\.from\('projects'\)\s*\.insert\(\s*payload\s*\)\s*\.select\('id'\)\s*\.single\(\)/,
    'Expected project insert to return record id'
  );
  assert.match(
    content,
    /if\s*\(\s*values\.assignTeamIds(?:\s*\?\.)?length\s*>\s*0\s*\)\s*\{/,
    'Expected guard for assignTeamIds'
  );
  assert.match(
    content,
    /const\s+teamPayloads\s*=\s*values\.assignTeamIds\.map\(\s*\(teamId\)\s*=>\s*\(\{\s*project_id:\s*projectRecord\.id,/,
    'Expected map to build project team payloads'
  );
  assert.match(
    content,
    /created_by:\s*userId/,
    'Expected team payloads to include created_by field'
  );
  assert.match(
    content,
    /await\s+supabase\s*\.from\('project_teams'\)\s*\.insert\(teamPayloads\)/,
    'Expected insertion into project_teams table'
  );
});

test('AddProjectModal includes audit fields when creating projects', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /created_by:\s*userId/, 'Expected created_by audit field');
  assert.match(content, /updated_by:\s*userId/, 'Expected updated_by audit field');
  assert.match(content, /created_at:\s*timestamp/, 'Expected created_at timestamp');
  assert.match(content, /updated_at:\s*timestamp/, 'Expected updated_at timestamp');
});
