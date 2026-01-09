import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getIntegrationClient, shouldRunIntegrationTests, generateIntegrationEmail, type IntegrationClient } from '../utils';

const runIntegration = shouldRunIntegrationTests();
const describeIf = runIntegration ? describe : describe.skip;

describeIf('Authentication API Flows', () => {
  let client: IntegrationClient;
  let tempEmail: string;
  let tempPassword: string;
  let userId: string | null = null;

  beforeAll(() => {
    client = getIntegrationClient();
    tempEmail = generateIntegrationEmail('auth-user');
    tempPassword = `Integration!${Date.now()}`;
  });

  afterAll(async () => {
    if (userId) {
      await client.auth.admin.deleteUser(userId);
    }
  });

  it('should sign up a worker account via admin API', async () => {
    const { data, error } = await client.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'worker' },
    });

    expect(error).toBeNull();
    userId = data.user?.id ?? null;
    expect(userId).toBeTruthy();
  });

  it('should exchange session tokens using credentials', async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: tempEmail,
      password: tempPassword,
    });

    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
  });

  it('should revoke session via sign out', async () => {
    const { error } = await client.auth.signOut();
    expect(error).toBeNull();
  });
});
