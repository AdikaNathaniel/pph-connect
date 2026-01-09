import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function readAllMigrations() {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return sqlFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readAllMigrations();

function expectColumn(columnName) {
  const patterns = [
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.rates_payable[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.rates_payable[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.rates_payable`
  );
}

test('rates_payable table defines required columns', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.rates_payable/i,
    'Expected migrations to create public.rates_payable table'
  );

  const requiredColumns = [
    'locale',
    'expert_tier',
    'country',
    'rate_per_unit',
    'rate_per_hour',
    'currency',
    'effective_from',
    'effective_to',
    'created_at',
    'created_by'
  ];

  requiredColumns.forEach(expectColumn);
});

test('rates_payable table enforces constraints and indexes', () => {
  assert.match(
    combinedSql,
    /CHECK\s*\(\s*effective_to\s+IS\s+NULL\s+OR\s+effective_to\s*>\s*effective_from\s*\)/i,
    'Expected CHECK constraint on effective date range'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_rates_locale_tier_country\s+ON\s+public\.rates_payable\s*\(\s*locale\s*,\s*expert_tier\s*,\s*country\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_rates_effective_dates\s+ON\s+public\.rates_payable\s*\(\s*effective_from\s*,\s*effective_to\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected rates_payable indexes for locale/tier/country and effective dates'
    );
  });
});

test('rates_payable table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.rates_payable\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on rates_payable'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.rates_payable\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on rates_payable'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.rates_payable[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on rates_payable'
  );
});
