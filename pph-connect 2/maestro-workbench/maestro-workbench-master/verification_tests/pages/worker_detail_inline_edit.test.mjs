import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const detailPagePath = resolvePath(['src', 'pages', 'manager', 'WorkerDetail.tsx']);

test('WorkerDetail configures inline edit dialog state and handlers', () => {
  assert.ok(existsSync(detailPagePath), 'Expected WorkerDetail.tsx to exist');
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*Dialog,\s*DialogContent,\s*DialogDescription,\s*DialogFooter,\s*DialogHeader,\s*DialogTitle\s*\}\s+from\s+'@\/components\/ui\/dialog';/,
    'Expected dialog UI imports for inline editing'
  );
  assert.match(
    content,
    /import\s+\{\s*Input\s*\}\s+from\s+'@\/components\/ui\/input';/,
    'Expected Input component import for inline editing'
  );
  assert.match(
    content,
    /import\s+\{\s*Label\s*\}\s+from\s+'@\/components\/ui\/label';/,
    'Expected Label component import for inline editing'
  );
  assert.match(
    content,
    /type\s+InlineEditableField\s*=\s*{/,
    'Expected InlineEditableField type definition'
  );
  assert.match(
    content,
    /const\s+\[inlineEditTarget,\s*setInlineEditTarget\]\s*=\s*useState<InlineEditableField\s*\|\s*null>\(/,
    'Expected inlineEditTarget state hook'
  );
  assert.match(
    content,
    /const\s+\[inlineEditValue,\s*setInlineEditValue\]\s*=\s*useState<string>\(/,
    'Expected inlineEditValue state hook'
  );
  assert.match(
    content,
    /const\s+\[isInlineEditSaving,\s*setIsInlineEditSaving\]\s*=\s*useState<boolean>\(/,
    'Expected isInlineEditSaving state hook'
  );
  assert.match(
    content,
    /const\s+editableProfileFields\s*=\s*useMemo<InlineEditableField\[\]>/,
    'Expected editable profile fields memo'
  );
  assert.match(
    content,
    /const\s+openInlineEdit\s*=\s*useCallback/,
    'Expected openInlineEdit handler'
  );
  assert.match(
    content,
    /const\s+handleInlineEditSubmit\s*=\s*useCallback/,
    'Expected inline edit submit handler'
  );
  assert.match(
    content,
    /<Dialog[^>]*data-testid="worker-detail-inline-edit-dialog"/,
    'Expected inline edit dialog with data-testid'
  );
});

test('WorkerDetail renders inline edit triggers for key profile items', () => {
  assert.ok(existsSync(detailPagePath), 'Expected WorkerDetail.tsx to exist');
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /editKey:\s*'personal-email'/,
    'Expected personal email profile item to expose inline edit key'
  );
  assert.match(
    content,
    /editKey:\s*'pph-email'/,
    'Expected PPH email profile item to expose inline edit key'
  );
  assert.match(
    content,
    /editKey:\s*'worker-role'/,
    'Expected worker role profile item to expose inline edit key'
  );
  assert.match(
    content,
    /editKey:\s*'country'/,
    'Expected country profile item to expose inline edit key'
  );
  assert.match(
    content,
    /data-testid=\{\s*`worker-detail-inline-edit-\${item\.editKey}`\s*\}/,
    'Expected inline edit trigger to derive data-testid from editable key'
  );
});

test('WorkerDetail inline edit handler updates Supabase and refreshes worker data', () => {
  assert.ok(existsSync(detailPagePath), 'Expected WorkerDetail.tsx to exist');
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /const\s+updates:\s*Record<string,\s*string\s*\|\s*null>\s*=\s*{[\s\S]*?inlineEditTarget\.field[\s\S]*?};/,
    'Expected inline edit handler to build updates payload keyed by target field'
  );
  assert.match(
    content,
    /await\s+supabase\s*\.\s*from\('workers'\)\s*\.update\([\s\S]*?\)\s*\.eq\('id',\s*workerId\)/,
    'Expected Supabase update call for inline edit'
  );
  assert.match(
    content,
    /toast\.(?:success|info)\(/,
    'Expected toast on inline edit completion'
  );
  assert.match(
    content,
    /toast\.error\(/,
    'Expected toast on inline edit error'
  );
  assert.match(
    content,
    /finally\s*\{\s*setIsInlineEditSaving\(false\);\s*\}/,
    'Expected inline edit save to reset saving state'
  );
  assert.match(
    content,
    /handleCloseInlineEdit\(\)/,
    'Expected inline edit handler to close dialog'
  );
  assert.match(
    content,
    /fetchWorker\(\)/,
    'Expected worker refetch after inline edit save'
  );
});
