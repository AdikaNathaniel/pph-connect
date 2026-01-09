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

const formPrimitivesPath = resolvePath('src', 'components', 'ui', 'form.tsx');

test('Form primitives provide inline error messaging with icon support', () => {
  const content = readFileSync(formPrimitivesPath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*AlertCircle\s*\}\s+from\s+['"]lucide-react['"];?/,
    'Expected AlertCircle icon import for error messaging'
  );
  assert.match(
    content,
    /AlertCircle\s+className="h-4 w-4"\s+aria-hidden="true"/,
    'Expected AlertCircle icon rendered with sizing and aria-hidden'
  );
  assert.match(
    content,
    /className=\{cn\("flex items-center gap-1\.5 text-sm font-medium text-destructive",\s*className\)\}/,
    'Expected error message to render with destructive styling and inline layout'
  );
});

test('FormMessage exposes errors using role="alert" for accessibility', () => {
  const content = readFileSync(formPrimitivesPath, 'utf8');

  assert.match(
    content,
    /<p\s+ref=\{ref\}[^>]*role="alert"/,
    'Expected FormMessage paragraph to announce errors with role="alert"'
  );
});
