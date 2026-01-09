import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getIntegrationClient, shouldRunIntegrationTests, type IntegrationClient } from '../utils';

const runIntegration = shouldRunIntegrationTests();
const describeIf = runIntegration ? describe : describe.skip;

describeIf('Project API - CRUD', () => {
  let client: IntegrationClient;
  let projectId: string | null = null;
  const projectCode = `INT-PRJ-${Date.now()}`;

  beforeAll(() => {
    client = getIntegrationClient();
  });

  afterAll(async () => {
    if (!projectId) return;
    await client.from('projects').delete().eq('id', projectId);
  });

  it('should create a project', async () => {
    const { data, error } = await client
      .from('projects')
      .insert({
        id: randomUUID(),
        project_code: projectCode,
        project_name: 'Integration Project',
        expert_tier: 'tier_1',
        status: 'active',
      })
      .select('id')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    projectId = data?.id ?? null;
  });

  it('should fetch created project', async () => {
    expect(projectId).toBeTruthy();
    const { data, error } = await client
      .from('projects')
      .select('id, project_code, status')
      .eq('id', projectId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.project_code).toBe(projectCode);
  });

  it('should update project attributes', async () => {
    expect(projectId).toBeTruthy();

    const { error } = await client
      .from('projects')
      .update({ project_name: 'Integration Project Updated', expert_tier: 'tier_2' })
      .eq('id', projectId);

    expect(error).toBeNull();

    const { data } = await client
      .from('projects')
      .select('project_name, expert_tier')
      .eq('id', projectId)
      .maybeSingle();
    expect(data?.project_name).toBe('Integration Project Updated');
    expect(data?.expert_tier).toBe('tier_2');
  });

  it('should archive project', async () => {
    expect(projectId).toBeTruthy();
    const { error } = await client
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectId);
    expect(error).toBeNull();

    const { data } = await client
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .maybeSingle();
    expect(data?.status).toBe('archived');
  });
});
