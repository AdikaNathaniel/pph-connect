import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const combinedSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

test('kb_categories table schema', () => {
  assert.match(combinedSql, /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.kb_categories/i, 'Expected kb_categories table');
  ['id', 'name', 'description', 'created_at'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`kb_categories[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
});

test('kb_articles table schema', () => {
  assert.match(combinedSql, /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.kb_articles/i, 'Expected kb_articles table');
  ['id', 'category_id', 'title', 'content', 'author_id', 'created_at', 'updated_at', 'views'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`kb_articles[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
  assert.match(combinedSql, /category_id[^\n]+REFERENCES\s+public\.kb_categories/i, 'Expected category FK');
});
