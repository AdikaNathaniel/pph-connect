import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'bgc-provider-research.md'),
    path.join(process.cwd(), 'Reference Docs', 'bgc-provider-research.md')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate bgc-provider-research.md');
  }
  return match;
};

const docPath = resolveDoc();
const content = readFileSync(docPath, 'utf8');

const providers = ['Checkr', 'Sterling', 'HireRight'];

const getSection = (provider) => {
  const start = content.indexOf(`## ${provider}`);
  assert.notEqual(start, -1, `Expected heading for ${provider}`);
  const rest = content.slice(start + provider.length + 3);
  const nextHeading = rest.indexOf('\n## ');
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
};

providers.forEach((provider) => {
  test(`${provider} section covers API, cost, turnaround`, () => {
    const section = getSection(provider);
    assert.match(section, /api/i, `Expected API mention for ${provider}`);
    assert.match(section, /cost|pricing/i, `Expected cost mention for ${provider}`);
    assert.match(section, /turnaround/i, `Expected turnaround mention for ${provider}`);
  });
});
