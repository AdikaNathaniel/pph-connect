import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

test('BGC integration service files exist', () => {
  const servicePath = resolveModule('src/services/bgcIntegrationService.ts');
  const clientPath = resolveModule('src/services/bgcProviderClient.ts');
  assert.ok(existsSync(servicePath), 'Expected bgcIntegrationService file');
  assert.ok(existsSync(clientPath), 'Expected bgcProviderClient file');
});
