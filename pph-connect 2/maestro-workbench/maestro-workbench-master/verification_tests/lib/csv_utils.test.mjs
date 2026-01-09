import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolveModule = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((entry) => existsSync(entry));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const modulePath = resolveModule('src', 'lib', 'utils', 'csv.ts');
const loadModule = async () => import(`${modulePath}?${Date.now()}`);

test('CSV utilities expose expected helpers', async () => {
  const mod = await loadModule();
  ['generateCSVTemplate', 'parseCSV', 'exportToCSV'].forEach((fn) => {
    assert.equal(typeof mod[fn], 'function', `Expected ${fn} export`);
  });
});

test('generateCSVTemplate returns CSV string with headers and optional example row', async () => {
  const { generateCSVTemplate } = await loadModule();
  const csv = generateCSVTemplate([
    { key: 'hr_id', label: 'HR ID' },
    { key: 'full_name', label: 'Full Name', example: 'Jane Doe' },
    { key: 'status', label: 'Status', example: 'active' }
  ]);

  assert.ok(csv.startsWith('HR ID,Full Name,Status'), 'Expected header row');
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2, 'Expected header plus example row');
  assert.equal(lines[1], ',Jane Doe,active', 'Expected example row to align with headers');
});

test('parseCSV converts CSV text into array of objects using header keys', async () => {
  const { parseCSV } = await loadModule();
  const csvText = 'hr_id,full_name,status\n101,Jane Doe,active\n102,John Smith,inactive\n';
  const { rows, headers } = parseCSV(csvText);

  assert.deepEqual(headers, ['hr_id', 'full_name', 'status'], 'Expected header keys');
  assert.equal(rows.length, 2, 'Expected two data rows');
  assert.deepEqual(rows[0], { hr_id: '101', full_name: 'Jane Doe', status: 'active' });
});

test('exportToCSV generates a Blob-like payload for downloading', async () => {
  const { exportToCSV } = await loadModule();
  let captured = null;

  const mockSaver = (filename, content) => {
    captured = { filename, content };
  };

  exportToCSV(
    [
      { hr_id: '101', full_name: 'Jane Doe', status: 'active' },
      { hr_id: '102', full_name: 'John Smith', status: 'inactive' }
    ],
    ['hr_id', 'full_name', 'status'],
    'workers.csv',
    mockSaver
  );

  assert.ok(captured, 'Expected saver callback to be invoked');
  assert.equal(captured?.filename, 'workers.csv', 'Expected filename to be forwarded');
  assert.equal(
    captured?.content.trim(),
    'hr_id,full_name,status\n101,Jane Doe,active\n102,John Smith,inactive',
    'Expected CSV content to match data rows'
  );
});
