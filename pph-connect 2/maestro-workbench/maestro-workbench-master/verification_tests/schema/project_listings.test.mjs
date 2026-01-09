import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = (() => {
  const candidates = [
    path.join(process.cwd(), 'supabase', 'migrations'),
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'supabase', 'migrations'),
  ];
  for (const dir of candidates) {
    try {
      readdirSync(dir);
      return dir;
    } catch {
      /* continue */
    }
  }
  throw new Error('Unable to locate supabase/migrations directory');
})();

const findMigration = (keyword, strategy = 'latest') => {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.toLowerCase().includes(keyword))
    .sort();
  if (files.length === 0) {
    throw new Error(`Unable to locate migration containing ${keyword}`);
  }
  const fileName = strategy === 'first' ? files[0] : files[files.length - 1];
  return readFileSync(path.join(migrationsDir, fileName), 'utf8');
};

test('project_listings table schema and policies exist', () => {
  const createContent = findMigration('create_project_listings', 'first');
  const latestContent = findMigration('project_listings', 'latest');
  assert.match(createContent, /CREATE\s+TABLE[\s\S]+public\.project_listings/i, 'Expected project_listings table creation');
  [
    'project_id uuid NOT NULL REFERENCES public.projects',
    'is_active boolean NOT NULL DEFAULT true',
    'required_skills text\[\]',
    'required_locales text\[\]',
    'required_tier public\.project_expert_tier',
    'description text'
  ].forEach((snippet) => {
    assert.match(createContent, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Expected column ${snippet}`);
  });
  assert.match(createContent, /created_at timestamptz NOT NULL DEFAULT now\(\)/i, 'Expected created_at column');
  assert.match(createContent, /updated_at timestamptz NOT NULL DEFAULT now\(\)/i, 'Expected updated_at column');
  assert.match(createContent, /CREATE\s+INDEX[\s\S]+idx_project_listings_active/i, 'Expected active index');
  assert.match(createContent, /CREATE\s+INDEX[\s\S]+idx_project_listings_project/i, 'Expected project index');
  assert.match(createContent, /ALTER\s+TABLE\s+public\.project_listings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled');
  assert.match(createContent, /CREATE\s+POLICY[\s\S]+authenticated users can read project listings/i, 'Expected read policy');
  assert.match(createContent, /CREATE\s+POLICY[\s\S]+admins can manage project listings/i, 'Expected admin manage policy');
  assert.match(latestContent, /ALTER\s+TABLE\s+public\.project_listings[\s\S]+ALTER\s+COLUMN\s+capacity_max\s+SET\s+NOT\s+NULL/i, 'Expected capacity_max constraint update');
});
