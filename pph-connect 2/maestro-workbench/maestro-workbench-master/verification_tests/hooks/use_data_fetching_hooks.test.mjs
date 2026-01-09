import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const hooks = [
  { file: ['src', 'hooks', 'useWorkers.tsx'], key: "['workers',", table: 'workers', expectRange: true },
  { file: ['src', 'hooks', 'useProjects.tsx'], key: "['projects']", table: 'projects' },
  { file: ['src', 'hooks', 'useTeams.tsx'], key: "['teams']", table: 'teams' },
  { file: ['src', 'hooks', 'useDepartments.tsx'], key: "['departments']", table: 'departments' }
];

const resolvePath = (...segments) => {
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

test('data fetching hooks export hooks using React Query', () => {
  hooks.forEach(({ file, key, table }) => {
    const fullPath = resolvePath(...file);
    assert.ok(existsSync(fullPath), `Expected ${file.join('/')} to exist`);
    const content = readFileSync(fullPath, 'utf8');
    const hookName = path.basename(file[file.length - 1], path.extname(file[file.length - 1]));

    assert.match(content, /import\s+\{\s*useQuery\s*\}\s+from\s+'@tanstack\/react-query';/, 'Expected useQuery import');
    assert.match(content, /createClient|supabase/, 'Expected supabase usage');
    assert.match(content, new RegExp(`export\\s+const\\s+${hookName}\\b`), `Expected ${hookName} export`);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(`queryKey:\\s*${escapedKey}`), `Expected query key ${key}`);
    const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      content,
      new RegExp(`supabase\\s*\\.from\\('${escapedTable}'\\)`),
      `Expected query against ${table} table`
    );
    assert.match(content, /staleTime:\s*(\d+|[A-Z_]+)/, 'Expected staleTime configuration');
    assert.match(content, /refetchOnWindowFocus:\s*false/, 'Expected refetchOnWindowFocus disabled');
    if (hook.expectRange) {
      assert.match(
        content,
        /select\([^\)]*,\s*\{\s*count:\s*'exact'\s*\}\)/,
        'Expected workers query to request total count for pagination'
      );
      assert.match(content, /\.range\(/, 'Expected workers query to use range for pagination');
      assert.match(
        content,
        /keepPreviousData:\s*true/,
        'Expected workers query to keep previous data during pagination'
      );
    }
  });
});
