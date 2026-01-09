import { test, expect, type Page } from '@playwright/test';
import { loginAs, navigateToApp } from '../support/session';

const workerEmail = process.env.PLAYWRIGHT_WORKER_EMAIL ?? 'worker@example.com';
const workerPassword = process.env.PLAYWRIGHT_WORKER_PASSWORD ?? 'password123';

const selectFirstRecipient = async (page: Page) => {
  const firstLabel = page.locator('label[for^="recipient-"]').first();
  await expect(firstLabel).toBeVisible();
  await firstLabel.click();
};

const typeMessageBody = async (page: Page, text: string) => {
  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  await page.keyboard.insertText(text);
};

 test.describe('Send message', () => {
  test('worker composes and sends a message', async ({ page }) => {
    await loginAs(page, {
      email: workerEmail,
      password: workerPassword,
      redirectTo: '/w/messages/compose',
    });

    await navigateToApp(page, '/w/messages/compose', {
      waitForSelector: 'text=Compose Message',
    });

    await page.waitForSelector('label[for^="recipient-"]');
    await selectFirstRecipient(page);

    const subject = `Playwright Test Message ${Date.now()}`;
    await page.getByLabel('Subject *').fill(subject);

    await typeMessageBody(page, 'Automated message body from Playwright');

    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(page.getByText('Message sent successfully!')).toBeVisible();
    await expect(page).toHaveURL(/\/w\/messages\/inbox$/);

    await page.getByRole('tab', { name: /sent/i }).click();
    await expect(page.getByText(subject).first()).toBeVisible();
  });
});
