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

const servicePath = resolvePath('src', 'services', 'skillTreeService.ts');

test('skillTreeService exposes config and progress helpers', () => {
  assert.ok(existsSync(servicePath), 'Expected skillTreeService to exist');
  const content = readFileSync(servicePath, 'utf8');
  ['getSkillTreeConfig', 'getWorkerSkillTreeProgress'].forEach((fn) => {
    assert.match(content, new RegExp(`export\\s+(?:async\\s+function|const)\\s+${fn}`), `Expected ${fn} export`);
  });
  assert.match(content, /nodes:\s*\[/i, 'Expected static tree definition');
  assert.match(content, /achievement/i, 'Expected achievements references');
  assert.match(content, /training/i, 'Expected training gate references');
});
