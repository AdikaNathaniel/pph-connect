import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';

const managerEmail = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const managerPassword = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'password123';

const selectOption = async (page: Page, dialog: Locator, label: string, option: string) => {
  await dialog.getByLabel(label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

const createWorkerViaModal = async (page: Page) => {
  const timestamp = Date.now();
  const hrId = `HR-ASSIGN-${timestamp}`;
  const fullName = `Assign Flow Worker ${timestamp}`;
  const personalEmail = `assign-${timestamp}@e2e.local`;

  await page.getByRole('button', { name: 'Add Worker' }).click();
  const dialog = page.getByTestId('add-worker-dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('HR ID').fill(hrId);
  await dialog.getByLabel('Full name').fill(fullName);
  await dialog.getByLabel('Personal email').fill(personalEmail);
  await dialog.getByLabel('PPH email').fill(`assign-${timestamp}@pph.local`);
  await dialog.getByLabel('Hire date').fill('2025-02-01');

  await selectOption(page, dialog, 'Engagement model', 'Core');
  await selectOption(page, dialog, 'Country of residence', 'United States');
  await selectOption(page, dialog, 'Primary locale', 'English (United States)');
  await selectOption(page, dialog, 'Status', 'Active');

  await dialog.getByTestId('worker-form-locale-all').getByLabel('English (United States)').click();
  await dialog.getByTestId('worker-form-submit').click();

  await expect(page.getByText('Worker created')).toBeVisible();
  await expect(page.getByRole('cell', { name: fullName })).toBeVisible({ timeout: 15000 });

  return fullName;
};

test.describe('Assign worker to project', () => {
  test('manager assigns newly created worker', async ({ page }) => {
    await loginAs(page, {
      email: managerEmail,
      password: managerPassword,
      redirectTo: '/m/workers',
    });

    await navigateToApp(page, '/m/workers', { waitForSelector: '[data-testid="workers-actions"]' });

    const workerName = await createWorkerViaModal(page);
    const row = page.getByRole('row', { name: new RegExp(workerName) });
    await row.getByRole('button', { name: 'Open actions' }).click();
    await page.getByTestId('workers-action-assign').click();

    const assignDialog = page.getByTestId('workers-assign-dialog');
    await expect(assignDialog).toBeVisible();
    await assignDialog.getByRole('button', { name: 'Select a project' }).click();
    await page.getByRole('option', { name: 'Project Atlas' }).click();
    await assignDialog.getByTestId('workers-assign-save').click();

    await expect(page.getByText(`Assigned worker ${workerName} to project Project Atlas.`)).toBeVisible();
  });
});
