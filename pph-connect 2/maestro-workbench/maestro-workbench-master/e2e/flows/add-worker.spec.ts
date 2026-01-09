import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';

const managerEmail = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const managerPassword = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'password123';

const selectOption = async (page: Page, dialog: Locator, label: string, option: string) => {
  await dialog.getByLabel(label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

test.describe('Add worker', () => {
  test('manager can add worker via modal form', async ({ page }) => {
    await loginAs(page, {
      email: managerEmail,
      password: managerPassword,
      redirectTo: '/m/workers',
    });

    await navigateToApp(page, '/m/workers', { waitForSelector: '[data-testid="workers-actions"]' });

    await page.getByRole('button', { name: /add worker/i }).click();
    const dialog = page.getByTestId('add-worker-dialog');
    await expect(dialog).toBeVisible();

    const timestamp = Date.now();
    const uniqueHrId = `HR-E2E-${timestamp}`;
    const uniqueName = `Playwright Worker ${timestamp}`;
    const uniqueEmail = `worker-${timestamp}@e2e.local`;

    await dialog.getByLabel('HR ID').fill(uniqueHrId);
    await dialog.getByLabel('Full name').fill(uniqueName);
    await dialog.getByLabel('Personal email').fill(uniqueEmail);
    await dialog.getByLabel('PPH email').fill(`pph-${timestamp}@pph.local`);
    await dialog.getByLabel('Hire date').fill('2025-01-01');

    await selectOption(page, dialog, 'Engagement model', 'Core');
    await selectOption(page, dialog, 'Country of residence', 'United States');
    await selectOption(page, dialog, 'Primary locale', 'English (United States)');
    await selectOption(page, dialog, 'Status', 'Active');

    await dialog.getByTestId('worker-form-locale-all').getByLabel('English (United States)').click();

    await dialog.getByTestId('worker-form-submit').click();

    await expect(page.getByText('Worker created')).toBeVisible();
    await expect(page.getByRole('cell', { name: uniqueName })).toBeVisible({ timeout: 15000 });
  });
});
