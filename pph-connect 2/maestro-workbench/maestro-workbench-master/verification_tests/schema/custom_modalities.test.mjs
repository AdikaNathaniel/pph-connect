import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const migrationCandidates = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'supabase', 'migrations'),
  path.join(process.cwd(), 'supabase', 'migrations'),
];

const migrationsDir = migrationCandidates.find((dir) => existsSync(dir)) ?? migrationCandidates[0];

const readAllMigrations = () =>
  readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');

const combinedSql = readAllMigrations();

const expectPattern = (pattern, message) => {
  assert.match(combinedSql, pattern, message);
};

test('custom_modalities table exists with required columns', () => {
  expectPattern(
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.custom_modalities/i,
    'Expected custom_modalities table definition'
  );
  ['name', 'modality_key', 'modality_config', 'column_config', 'created_by'].forEach((column) => {
    expectPattern(new RegExp(`${column}\\s`, 'i'), `Expected ${column} column`);
  });
});

test('custom_modalities has indexes and RLS policies', () => {
  expectPattern(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_custom_modalities_creator/i,
    'Expected index on created_by'
  );
  expectPattern(/ALTER\s+TABLE\s+public\.custom_modalities\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'Expected RLS enabled');
  expectPattern(/CREATE\s+POLICY\s+"Admins can manage custom modalities"/i, 'Expected admin policy');
});
