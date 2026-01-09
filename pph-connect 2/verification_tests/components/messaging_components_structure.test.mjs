import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const messagingDir = path.join(process.cwd(), 'src', 'components', 'messaging');

const readMessagingFile = (filename) => {
  const filePath = path.join(messagingDir, filename);
  assert.ok(existsSync(filePath), `Expected ${filename} in src/components/messaging`);
  return readFileSync(filePath, 'utf8');
};

test('messaging components directory includes rich text editor assets', () => {
  assert.ok(
    existsSync(messagingDir),
    'Expected messaging components directory at src/components/messaging'
  );

  ['RichTextEditor.tsx', 'RichTextEditor.css'].forEach((file) => {
    assert.ok(
      existsSync(path.join(messagingDir, file)),
      `Expected ${file} to be present`
    );
  });
});

test('RichTextEditor integrates TipTap extensions and toolbar controls', () => {
  const content = readMessagingFile('RichTextEditor.tsx');
  assert.match(content, /useEditor/i, 'Expected TipTap useEditor hook');
  assert.match(content, /StarterKit/i, 'Expected StarterKit extension import');
  assert.match(content, /Underline\s+from\s+'@tiptap\/extension-underline'/i, 'Expected underline extension import');
  assert.match(content, /Placeholder\.configure/i, 'Expected placeholder configuration');
  assert.match(content, /Button[\s\S]*toggleBold/i, 'Expected bold toolbar action');
  assert.match(content, /onChange\(\s*editor\.getHTML\(\)\s*\)/i, 'Expected HTML change callback');
  assert.match(content, /import '.\/RichTextEditor\.css';/i, 'Expected CSS import for editor styling');
});
