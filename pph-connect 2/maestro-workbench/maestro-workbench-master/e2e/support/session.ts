import type { Page } from '@playwright/test';

export type LoginOptions = {
  email?: string;
  password?: string;
  redirectTo?: string;
};

const getDefaultEmail = () => process.env.PLAYWRIGHT_WORKER_EMAIL ?? 'worker@example.com';
const getDefaultPassword = () => process.env.PLAYWRIGHT_WORKER_PASSWORD ?? 'password123';

export const loginAs = async (page: Page, options: LoginOptions = {}) => {
  const email = options.email ?? getDefaultEmail();
  const password = options.password ?? getDefaultPassword();
  const search = options.redirectTo ? `?redirectTo=${encodeURIComponent(options.redirectTo)}` : '';

  await page.goto(`/login${search}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForLoadState('networkidle');
};

export type NavigateOptions = {
  waitForSelector?: string;
};

export const navigateToApp = async (page: Page, path: string, options: NavigateOptions = {}) => {
  if (!path.startsWith('/')) {
    throw new Error('navigateToApp paths must start with "/"');
  }

  await page.goto(path);
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector);
    return;
  }
  await page.waitForLoadState('networkidle');
};
