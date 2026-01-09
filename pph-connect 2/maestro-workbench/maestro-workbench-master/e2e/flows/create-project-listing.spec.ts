import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAs, navigateToApp } from '../support/session';
import type { Database } from '../../src/integrations/supabase/types';

const managerEmail = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const managerPassword = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'password123';

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const fetchProjectId = async () => {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No projects available to create a listing');
  }
  return data.id;
};

const fillListingForm = async (page, projectId: string, uniqueSkill: string) => {
  await page.getByTestId('project-listing-project-id').fill(projectId);
  await page.getByTestId('project-listing-capacity').fill('25');
  await page.getByTestId('project-listing-skills').fill(uniqueSkill);
  await page.getByTestId('project-listing-locales').fill('en-US');
  await page.getByTestId('project-listing-tier').fill('tier0');
  await page.getByTestId('project-listing-description').fill('Playwright automated listing');
};

 test.describe('Create project listing', () => {
  test('manager creates a new listing', async ({ page }) => {
    const projectId = await fetchProjectId();
    const uniqueSkill = `automation-skill-${Date.now()}`;

    await loginAs(page, {
      email: managerEmail,
      password: managerPassword,
      redirectTo: '/m/project-listings/new',
    });

    await navigateToApp(page, '/m/project-listings/new', {
      waitForSelector: '[data-testid="project-listing-form"]',
    });

    await fillListingForm(page, projectId, uniqueSkill);
    await page.getByTestId('project-listing-submit').click();

    await expect(page.getByText('Listing created')).toBeVisible();
    await expect(page).toHaveURL(/\/m\/project-listings$/);

    await expect(page.getByTestId('project-listings-table')).toBeVisible();
    await expect(page.getByText(uniqueSkill).first()).toBeVisible({ timeout: 15000 });
  });
});
