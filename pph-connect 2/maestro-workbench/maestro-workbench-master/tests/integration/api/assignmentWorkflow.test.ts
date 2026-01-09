import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  getIntegrationClient,
  shouldRunIntegrationTests,
  generateIntegrationEmail,
  type IntegrationClient,
} from '../utils';

const runIntegration = shouldRunIntegrationTests();
const describeIf = runIntegration ? describe : describe.skip;

describeIf('Assignment Workflow API', () => {
  let client: IntegrationClient;
  let workerId: string;
  let projectId: string;
  let assignmentId: string | null = null;

  beforeAll(async () => {
    client = getIntegrationClient();

    const workerEmail = generateIntegrationEmail('assignment-worker');
    const workerInsert = await client
      .from('workers')
      .insert({
        id: randomUUID(),
        hr_id: `HR-ASSIGN-${Date.now()}`,
        full_name: 'Assignment Worker',
        email_personal: workerEmail,
        email_pph: workerEmail,
        engagement_model: 'contractor',
        worker_status: 'active',
      })
      .select('id')
      .maybeSingle();
    if (workerInsert.error || !workerInsert.data?.id) {
      throw workerInsert.error ?? new Error('Failed to insert assignment worker');
    }
    workerId = workerInsert.data.id;

    const projectInsert = await client
      .from('projects')
      .insert({
        id: randomUUID(),
        project_code: `ASSIGN-${Date.now()}`,
        project_name: 'Assignment Project',
        expert_tier: 'tier_1',
        status: 'active',
      })
      .select('id')
      .maybeSingle();
    if (projectInsert.error || !projectInsert.data?.id) {
      throw projectInsert.error ?? new Error('Failed to insert assignment project');
    }
    projectId = projectInsert.data.id;
  });

  afterAll(async () => {
    if (assignmentId) {
      await client.from('worker_assignments').delete().eq('id', assignmentId);
    }
    if (workerId) {
      await client.from('workers').delete().eq('id', workerId);
    }
    if (projectId) {
      await client.from('projects').delete().eq('id', projectId);
    }
  });

  it('should link worker to project', async () => {
    const insert = await client
      .from('worker_assignments')
      .insert({
        id: randomUUID(),
        worker_id: workerId,
        project_id: projectId,
        assigned_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    expect(insert.error).toBeNull();
    assignmentId = insert.data?.id ?? null;
    expect(assignmentId).toBeTruthy();
  });

  it('should pull active assignments for worker', async () => {
    expect(assignmentId).toBeTruthy();
    const { data, error } = await client
      .from('worker_assignments')
      .select('id, project_id, removed_at')
      .eq('worker_id', workerId)
      .is('removed_at', null);

    expect(error).toBeNull();
    expect(data?.some((assignment) => assignment.id === assignmentId)).toBe(true);
  });

  it('should record unassignment event', async () => {
    expect(assignmentId).toBeTruthy();
    const removal = await client
      .from('worker_assignments')
      .update({
        removed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);
    expect(removal.error).toBeNull();

    const { data } = await client
      .from('worker_assignments')
      .select('removed_at')
      .eq('id', assignmentId)
      .maybeSingle();
    expect(data?.removed_at).not.toBeNull();
  });
});
