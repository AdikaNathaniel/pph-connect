import { test, expect } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';

const workerEmail = process.env.PLAYWRIGHT_WORKER_EMAIL ?? 'worker@example.com';
const workerPassword = process.env.PLAYWRIGHT_WORKER_PASSWORD ?? 'password123';

const viewAssignments = async (page: any) => {
  await expect(page.getByTestId('worker-dashboard-summary-grid')).toBeVisible();
  await expect(page.getByTestId('worker-dashboard-quick-actions')).toBeVisible();
  await page.getByTestId('worker-dashboard-quick-action-assignments').click();
  const panel = page.getByTestId('worker-visibility-panel');
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('worker-visibility-available')).toBeVisible();
  await expect(page.getByTestId('worker-visibility-locked')).toBeVisible();
};

const viewEarnings = async (page: any) => {
  await navigateToApp(page, '/w/earnings', { waitForSelector: '[data-testid="worker-earnings-summary"]' });
  await expect(page.getByTestId('worker-earnings-summary')).toBeVisible();
  await expect(page.getByTestId('worker-earnings-history')).toBeVisible();
};

test.describe('Worker self-service', () => {
  test('worker reviews assignments and earnings', async ({ page }) => {
    await loginAs(page, {
      email: workerEmail,
      password: workerPassword,
      redirectTo: '/w/dashboard',
    });

    await navigateToApp(page, '/w/dashboard', {
      waitForSelector: '[data-testid="worker-dashboard-summary-grid"]',
    });

    await viewAssignments(page);
    await viewEarnings(page);
  });
});
