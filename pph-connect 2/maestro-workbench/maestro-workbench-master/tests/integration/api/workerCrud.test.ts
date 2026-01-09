import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getIntegrationClient, shouldRunIntegrationTests, generateIntegrationEmail, type IntegrationClient } from '../utils';

const runIntegration = shouldRunIntegrationTests();
const describeIf = runIntegration ? describe : describe.skip;

describeIf('Worker API - CRUD', () => {
  let client: IntegrationClient;
  let workerId: string | null = null;
  const uniqueEmail = generateIntegrationEmail('worker');

  beforeAll(() => {
    client = getIntegrationClient();
  });

  afterAll(async () => {
    if (!workerId) return;
    await client.from('workers').delete().eq('id', workerId);
  });

  it('should create a worker record', async () => {
    const { data, error } = await client
      .from('workers')
      .insert({
        id: randomUUID(),
        hr_id: `HR-${Date.now()}`,
        full_name: 'Integration Worker',
        email_personal: uniqueEmail,
        email_pph: uniqueEmail,
        engagement_model: 'contractor',
        worker_status: 'active',
      })
      .select('id')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    workerId = data?.id ?? null;
  });

  it('should fetch newly created worker', async () => {
    expect(workerId).toBeTruthy();

    const { data, error } = await client
      .from('workers')
      .select('id, full_name, worker_status')
      .eq('id', workerId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.full_name).toBe('Integration Worker');
    expect(data?.worker_status).toBe('active');
  });

  it('should update worker status', async () => {
    expect(workerId).toBeTruthy();

    const { error } = await client
      .from('workers')
      .update({ worker_status: 'inactive' })
      .eq('id', workerId);

    expect(error).toBeNull();

    const { data } = await client
      .from('workers')
      .select('worker_status')
      .eq('id', workerId)
      .maybeSingle();
    expect(data?.worker_status).toBe('inactive');
  });

  it('should delete worker record', async () => {
    expect(workerId).toBeTruthy();

    const { error } = await client.from('workers').delete().eq('id', workerId);
    expect(error).toBeNull();

    const { data } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .maybeSingle();
    expect(data).toBeNull();
    workerId = null;
  });
});
