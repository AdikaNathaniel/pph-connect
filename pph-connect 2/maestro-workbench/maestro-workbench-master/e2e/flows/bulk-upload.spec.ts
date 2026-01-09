import { test, expect } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';
import path from 'node:path';
import fs from 'node:fs/promises';

const managerEmail = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const managerPassword = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'password123';

const fixturesRoot = path.join(__dirname, '..', 'fixtures');
const templatePath = path.resolve(fixturesRoot, 'workers_sample.csv');

async function generateTempCsv() {
  const timestamp = Date.now();
  const tempPath = path.join(process.cwd(), 'test-results', `workers-${timestamp}.csv`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });
  const content = await fs.readFile(templatePath, 'utf8');
  await fs.writeFile(tempPath, content.replace(/HR-BULK/g, `HR-BULK-${timestamp}`));
  return tempPath;
}

const nextStep = async (page: any, label: string) => {
  await page.getByTestId('bulk-upload-step-indicator').getByRole('button', { name: label }).click();
};

test.describe('Bulk upload', () => {
  test('manager can import workers via CSV', async ({ page }) => {
    const tempCsv = await generateTempCsv();

    await loginAs(page, {
      email: managerEmail,
      password: managerPassword,
      redirectTo: '/m/workers',
    });

    await navigateToApp(page, '/m/workers', { waitForSelector: '[data-testid="workers-actions"]' });

    await page.getByRole('button', { name: 'Bulk Upload' }).click();
    await expect(page.getByTestId('bulk-upload-dialog')).toBeVisible();

    await page.getByTestId('bulk-upload-download-template').click();
    await nextStep(page, 'Upload');

    await page.getByTestId('bulk-upload-file-input').setInputFiles(tempCsv);
    await page.getByRole('button', { name: 'Validate file' }).click();

    await nextStep(page, 'Validate');
    await expect(page.getByTestId('bulk-upload-validation-summary')).toContainText('2 valid rows');

    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByTestId('bulk-upload-preview-table')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm import' }).click();

    await expect(page.getByTestId('bulk-upload-progress')).toBeVisible();
    await expect(page.getByText('Workers imported')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('2 imported')).toBeVisible();
  });
});
