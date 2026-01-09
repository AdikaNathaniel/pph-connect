import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function readCombinedSql() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readCombinedSql();

const tablesRequiringAdminHelper = [
  'departments',
  'teams',
  'projects',
  'worker_accounts',
  'worker_assignments',
  'worker_skills',
  'skill_assessments',
  'worker_applications',
  'project_listings',
  'rates_payable',
  'performance_reviews',
  'quality_metrics',
  'auto_removals',
  'work_stats',
  'training_gates',
  'worker_training_access',
  'training_materials'
];
const expectedRoleArrays = [
  /worker_has_role\(auth\.uid\(\),\s*ARRAY\[\s*'super_admin'\s*,\s*'admin'\s*\]\)/i,
  /worker_has_role\(auth\.uid\(\),\s*ARRAY\[\s*'super_admin'\s*,\s*'admin'\s*,\s*'manager'\s*\]\)/i,
  /worker_has_role\(auth\.uid\(\),\s*ARRAY\[\s*'super_admin'\s*,\s*'admin'\s*,\s*'manager'\s*,\s*'team_lead'\s*\]\)/i,
];

test('admin write policies use worker_has_role helper', () => {
  tablesRequiringAdminHelper.forEach((table) => {
    const pattern = new RegExp(
      `CREATE\\s+POLICY\\s+"[^"]*"\\s+ON\\s+public\\.${table}[\\s\\S]+worker_has_role`,
      'i'
    );

    assert.match(
      combinedSql,
      pattern,
      `Expected ${table} policies to leverage worker_has_role helper`
    );
  });
});

test('admin policies reference super_admin role hierarchy', () => {
  expectedRoleArrays.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected worker_has_role arrays to include super_admin hierarchy'
    );
  });
});
