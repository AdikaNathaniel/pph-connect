import { test, expect } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';

test.describe('User login', () => {
  test('worker can sign in and reach dashboard', async ({ page }) => {
    await loginAs(page, { redirectTo: '/w/dashboard' });
    await navigateToApp(page, '/w/dashboard', {
      waitForSelector: '[data-testid="worker-dashboard-summary-grid"]',
    });

    await expect(page.getByTestId('worker-dashboard-summary-grid')).toBeVisible();
    await expect(page.getByRole('heading', { name: /worker dashboard/i })).toBeVisible();
  });
});
