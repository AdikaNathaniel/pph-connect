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
      // continue
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

test('invoice_adjustments table schema and security are defined', () => {
  const content = findMigration('invoice_adjustments');
  assert.match(content, /CREATE\s+TABLE[\s\S]+public\.invoice_adjustments/i, 'Expected invoice_adjustments table');
  [
    'invoice_id uuid NOT NULL REFERENCES public.invoices',
    'adjustment_type text NOT NULL',
    'amount numeric NOT NULL',
    'reason text',
    'created_by uuid REFERENCES public.profiles'
  ].forEach((snippet) => {
    assert.match(content, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Expected column ${snippet}`);
  });
  assert.match(content, /created_at timestamptz NOT NULL DEFAULT now\(\)/i, 'Expected created_at');
  assert.match(content, /CREATE\s+INDEX[\s\S]+idx_invoice_adjustments_invoice/i, 'Expected invoice index');
  assert.match(content, /ALTER\s+TABLE\s+public\.invoice_adjustments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled');
  assert.match(content, /CREATE\s+POLICY[\s\S]+authenticated users can read invoice adjustments/i, 'Expected read policy');
  assert.match(content, /CREATE\s+POLICY[\s\S]+admins can manage invoice adjustments/i, 'Expected admin policy');
});
