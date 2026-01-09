import { test, expect } from '@playwright/test';

test.describe('smoke e2e', () => {
  test('math sanity check', async () => {
    expect(2 + 2).toBe(4);
  });
});
