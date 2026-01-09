import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'send-message', 'index.ts');

test('send-message function exists and uses worker-based tables', () => {
  assert.ok(existsSync(functionPath), 'Expected send-message/index.ts to exist');
  const content = readFileSync(functionPath, 'utf8');

  assert.match(content, /from\('group_members'\)/i, 'Expected group membership check');
  assert.match(content, /message_recipients/i, 'Expected recipient creation logic');
  assert.match(content, /message_threads/i, 'Expected thread handling');
});
