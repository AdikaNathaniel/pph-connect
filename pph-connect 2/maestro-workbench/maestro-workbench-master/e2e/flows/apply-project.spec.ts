import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAs, navigateToApp } from '../support/session';
import type { Database } from '../../src/integrations/supabase/types';

const workerEmail = process.env.PLAYWRIGHT_WORKER_EMAIL ?? 'worker@example.com';
const workerPassword = process.env.PLAYWRIGHT_WORKER_PASSWORD ?? 'password123';

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const fetchProjectId = async () => {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, project_name')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No project available to create listing');
  }
  return data;
};

const createListing = async () => {
  const project = await fetchProjectId();
  const listingDescription = `Playwright listing ${Date.now()}`;
  const { data, error } = await supabaseAdmin
    .from('project_listings')
    .insert({
      project_id: project.id,
      is_active: true,
      capacity_max: 25,
      capacity_current: 0,
      required_skills: [],
      required_locales: [],
      required_tier: 'tier0',
      description: listingDescription,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create test listing');
  }
  return { listingId: data.id, description: listingDescription };
};

const deleteListing = async (listingId: string) => {
  await supabaseAdmin.from('project_listings').delete().eq('id', listingId);
};

test.describe('Apply to project listing', () => {
  test('worker applies to a freshly created listing', async ({ page }) => {
    const tempListing = await createListing();
    try {
      await loginAs(page, {
        email: workerEmail,
        password: workerPassword,
        redirectTo: '/w/projects/available',
      });

      await navigateToApp(page, '/w/projects/available', {
        waitForSelector: '[data-testid="available-project-card"]',
      });

      const listingCard = page.locator(`[data-project-id="${tempListing.listingId}"]`).first();
      await listingCard.scrollIntoViewIfNeeded();
      await expect(listingCard).toBeVisible();

      await listingCard.getByTestId('available-project-apply').click();
      const modal = page.getByTestId('apply-confirmation-modal');
      await expect(modal).toBeVisible();

      await modal.getByLabel('Cover message (optional)').fill('Interested via Playwright automation');
      await modal.getByTestId('apply-confirmation-submit').click();

      await expect(page.getByText('Application submitted')).toBeVisible();
      await expect(listingCard.getByText('Applied')).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteListing(tempListing.listingId);
    }
  });
});
