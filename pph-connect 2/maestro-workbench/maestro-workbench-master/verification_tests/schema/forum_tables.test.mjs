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

test('forum_categories table schema', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.forum_categories/i,
    'Expected forum_categories table'
  );
  ['id', 'name', 'description', 'created_at'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`forum_categories[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
});

test('forum_threads table schema', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.forum_threads/i,
    'Expected forum_threads table'
  );
  ['id', 'category_id', 'title', 'author_id', 'created_at', 'pinned', 'locked'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`forum_threads[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
  assert.match(
    combinedSql,
    /category_id[^\n]+REFERENCES\s+public\.forum_categories/i,
    'Expected category FK'
  );
});

test('forum_posts table schema', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.forum_posts/i,
    'Expected forum_posts table'
  );
  ['id', 'thread_id', 'author_id', 'content', 'created_at', 'edited_at', 'upvotes'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`forum_posts[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
  assert.match(
    combinedSql,
    /thread_id[^\n]+REFERENCES\s+public\.forum_threads/i,
    'Expected thread FK'
  );
});

test('forum_votes table schema', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.forum_votes/i,
    'Expected forum_votes table'
  );
  ['id', 'post_id', 'voter_id', 'vote_type', 'created_at'].forEach((column) => {
    assert.match(combinedSql, new RegExp(`forum_votes[\\s\\S]+${column}`, 'i'), `Expected ${column}`);
  });
  assert.match(
    combinedSql,
    /post_id[^\n]+REFERENCES\s+public\.forum_posts/i,
    'Expected post FK'
  );
  assert.match(
    combinedSql,
    /UNIQUE\s+INDEX[^\n]+\(\s*post_id\s*,\s*voter_id\s*\)/i,
    'Expected uniqueness constraint to prevent duplicate votes'
  );
});
