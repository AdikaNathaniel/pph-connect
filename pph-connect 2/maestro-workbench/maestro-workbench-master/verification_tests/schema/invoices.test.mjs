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
    } catch (error) {
      /* continue */
    }
  }
  throw new Error('Unable to locate supabase/migrations directory');
})();

const findMigration = (keyword) => {
  const files = readdirSync(migrationsDir);
  const match = files.find((file) => file.toLowerCase().includes(keyword));
  if (!match) {
    throw new Error(`Unable to locate migration containing ${keyword}`);
  }
  return readFileSync(path.join(migrationsDir, match), 'utf8');
};

test('invoices table schema and policies are defined', () => {
  const content = findMigration('create_invoices');
  assert.match(content, /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?invoice_status\s+AS\s+ENUM/i, 'Expected invoice_status enum');
  assert.match(content, /CREATE\s+TABLE[\s\S]+public\.invoices/i, 'Expected invoices table creation');
  ['worker_id uuid NOT NULL REFERENCES public.workers', 'period_start date NOT NULL', 'period_end date NOT NULL', 'total_amount numeric', 'status invoice_status NOT NULL', 'approved_by uuid REFERENCES public.profiles']
    .forEach((snippet) => {
      assert.match(content, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Expected column ${snippet}`);
    });
  assert.match(content, /CREATE\s+INDEX[\s\S]+idx_invoices_worker/i, 'Expected worker index');
  assert.match(content, /CREATE\s+INDEX[\s\S]+idx_invoices_status/i, 'Expected status index');
  assert.match(content, /ALTER\s+TABLE\s+public\.invoices\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled');
  assert.match(content, /CREATE\s+POLICY[\s\S]+authenticated users can read invoices/i, 'Expected read policy');
  assert.match(content, /CREATE\s+POLICY[\s\S]+admins can manage invoices/i, 'Expected admin policy');
});
