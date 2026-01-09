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

describeIf('Messaging API Flows', () => {
  let client: IntegrationClient;
  let senderProfileId: string;
  let recipientProfileId: string;
  let threadId: string | null = null;
  let messageId: string | null = null;

  const createProfile = async (name: string, role: 'manager' | 'worker') => {
    const profileEmail = generateIntegrationEmail(`profile-${role}`);
    const { data, error } = await client
      .from('profiles')
      .insert({
        id: randomUUID(),
        full_name: name,
        email: profileEmail,
        role,
      })
      .select('id')
      .maybeSingle();

    if (error || !data?.id) {
      throw error ?? new Error('Failed to create profile');
    }
    return data.id;
  };

  beforeAll(async () => {
    client = getIntegrationClient();
    senderProfileId = await createProfile('Integration Manager', 'manager');
    recipientProfileId = await createProfile('Integration Worker', 'worker');
  });

  afterAll(async () => {
    if (messageId) {
      await client.from('message_recipients').delete().eq('message_id', messageId);
      await client.from('messages').delete().eq('id', messageId);
    }
    if (threadId) {
      await client.from('message_threads').delete().eq('id', threadId);
    }
    if (senderProfileId) {
      await client.from('profiles').delete().eq('id', senderProfileId);
    }
    if (recipientProfileId) {
      await client.from('profiles').delete().eq('id', recipientProfileId);
    }
  });

  it('should create direct thread between participants', async () => {
    const insert = await client
      .from('message_threads')
      .insert({
        id: randomUUID(),
        subject: 'Integration Direct Thread',
        created_by: senderProfileId,
      })
      .select('id')
      .maybeSingle();

    expect(insert.error).toBeNull();
    threadId = insert.data?.id ?? null;
    expect(threadId).toBeTruthy();
  });

  it('should post message and register recipient', async () => {
    expect(threadId).toBeTruthy();
    const messageInsert = await client
      .from('messages')
      .insert({
        id: randomUUID(),
        thread_id: threadId,
        sender_id: senderProfileId,
        content: 'Integration ping',
      })
      .select('id')
      .maybeSingle();

    expect(messageInsert.error).toBeNull();
    messageId = messageInsert.data?.id ?? null;
    expect(messageId).toBeTruthy();

    const recipientInsert = await client
      .from('message_recipients')
      .insert({
        message_id: messageId,
        recipient_id: recipientProfileId,
      })
      .select('id')
      .maybeSingle();

    expect(recipientInsert.error).toBeNull();
  });

  it('should mark thread as read for recipient', async () => {
    expect(messageId).toBeTruthy();
    const readAt = new Date().toISOString();
    const update = await client
      .from('message_recipients')
      .update({ read_at: readAt })
      .eq('message_id', messageId)
      .eq('recipient_id', recipientProfileId);
    expect(update.error).toBeNull();

    const { data } = await client
      .from('message_recipients')
      .select('read_at')
      .eq('message_id', messageId)
      .eq('recipient_id', recipientProfileId)
      .maybeSingle();
    expect(data?.read_at).toBeDefined();
  });
});
