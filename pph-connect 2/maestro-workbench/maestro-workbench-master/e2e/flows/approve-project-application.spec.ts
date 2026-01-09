import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAs, navigateToApp } from '../support/session';
import type { Database } from '../../src/integrations/supabase/types';

const managerEmail = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const managerPassword = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'password123';
const workerEmail = process.env.PLAYWRIGHT_WORKER_EMAIL ?? 'worker@example.com';

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const fetchProject = async () => {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, project_name')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No project available for applications');
  }
  return data;
};

const fetchWorker = async () => {
  const { data, error } = await supabaseAdmin
    .from('workers')
    .select('id')
    .eq('email_personal', workerEmail)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Worker account not found for application approval test');
  }
  return data.id;
};

const createListingAndApplication = async () => {
  const project = await fetchProject();
  const workerId = await fetchWorker();
  const listingDescription = `Playwright pending listing ${Date.now()}`;

  const { data: listing, error: listingError } = await supabaseAdmin
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

  if (listingError || !listing) {
    throw new Error('Failed to create pending listing for approval test');
  }

  const { data: application, error: applicationError } = await supabaseAdmin
    .from('worker_applications')
    .insert({
      worker_id: workerId,
      project_listing_id: listing.id,
      notes: 'Playwright pending application',
      status: 'pending',
    })
    .select('id')
    .single();

  if (applicationError || !application) {
    throw new Error('Failed to create pending application');
  }

  return { projectId: project.id, listingId: listing.id, applicationId: application.id };
};

const cleanup = async (applicationId: string, listingId: string) => {
  await supabaseAdmin.from('worker_applications').delete().eq('id', applicationId);
  await supabaseAdmin.from('project_listings').delete().eq('id', listingId);
};

 test.describe('Approve project application', () => {
  test('manager approves pending application', async ({ page }) => {
    const tempData = await createListingAndApplication();

    try {
      await loginAs(page, {
        email: managerEmail,
        password: managerPassword,
        redirectTo: `/m/projects/${tempData.projectId}/applications`,
      });

      await navigateToApp(page, `/m/projects/${tempData.projectId}/applications`, {
        waitForSelector: '[data-testid="project-applications-list"]',
      });

      const card = page.locator(`[data-testid="project-application-card"][data-application-id="${tempData.applicationId}"]`).first();
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();

      await card.getByTestId('project-application-approve').click();
      await expect(page.getByText('Application approved')).toBeVisible();
      await expect(card.getByText('Approved')).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup(tempData.applicationId, tempData.listingId);
    }
  });
});
