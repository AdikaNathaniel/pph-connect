import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

export type IntegrationClient = SupabaseClient<Database>;

export const shouldRunIntegrationTests = () => process.env.RUN_INTEGRATION_TESTS === 'true';

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required integration environment variable: ${key}`);
  }
  return value;
};

export const getIntegrationClient = (): IntegrationClient => {
  const url = getRequiredEnv('SUPABASE_URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY for integration tests');
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const generateIntegrationEmail = (slug: string) =>
  `${slug}-${Date.now()}-${Math.floor(Math.random() * 1000)}@integration.test`;
