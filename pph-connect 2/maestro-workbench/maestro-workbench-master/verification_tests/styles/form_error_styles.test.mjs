import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const indexCssPath = resolvePath('src', 'index.css');

test('Invalid form controls display red border and icon affordance', () => {
  const content = readFileSync(indexCssPath, 'utf8');

  assert.match(
    content,
    /input\[aria-invalid="true"]/,
    'Expected invalid input selector styling in index.css'
  );
  assert.match(
    content,
    /textarea\[aria-invalid="true"]/,
    'Expected invalid textarea selector styling in index.css'
  );
  assert.match(
    content,
    /button\[aria-invalid="true"]\[role="combobox"]/,
    'Expected invalid combobox selector styling in index.css'
  );
  assert.match(
    content,
    /@apply\s+border-destructive/,
    'Expected destructive border styling for invalid fields'
  );
  assert.match(
    content,
    /background-image:\s*url\("data:image\/svg\+xml/,
    'Expected warning icon background image for invalid fields'
  );
});

test('Invalid form controls tint text/icon color to destructive palette', () => {
  const content = readFileSync(indexCssPath, 'utf8');

  assert.match(
    content,
    /color:\s*hsl\(var\(--destructive\)\);/,
    'Expected invalid control text/icon color to leverage destructive palette'
  );
});
