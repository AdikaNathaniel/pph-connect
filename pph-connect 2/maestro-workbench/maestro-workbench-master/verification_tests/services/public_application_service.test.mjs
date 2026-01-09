import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const servicePath = resolvePath('src', 'services', 'publicApplicationService.ts');

test('publicApplicationService exports submit helper and uses applications table', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+type\s+PublicApplicationPayload/, 'Expected payload type export');
  assert.match(content, /export\s+async\s+function\s+submitPublicApplication/, 'Expected submit function export');
  assert.match(
    content,
    /supabase\.from\(['"]applications['"]\)\.insert/i,
    'Expected insert into applications table'
  );
  assert.match(content, /status:\s*'pending'/i, 'Expected pending status assignment');
  assert.match(content, /application_data/i, 'Expected application_data JSON payload');
  assert.match(content, /notifyAdminsOfPublicApplication/i, 'Expected admin notification helper');
});
