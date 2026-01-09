import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'validate-message-permissions', 'index.ts');

test('validate-message-permissions function exists', () => {
  assert.ok(existsSync(functionPath), 'Expected validate-message-permissions/index.ts to exist');
  const content = readFileSync(functionPath, 'utf8');
  assert.match(content, /can_message_user/i, 'Expected messaging permission helper usage');
});
