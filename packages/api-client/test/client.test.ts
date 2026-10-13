import { InMemoryPerspectiveClient } from '../src';

describe('InMemoryPerspectiveClient Test Suite', () => {
  let client: InMemoryPerspectiveClient;

  beforeEach(() => {
    client = new InMemoryPerspectiveClient();
  });

  it('fetches finite daily explore batch with impression token', async () => {
    const batch = await client.getExploreBatch();
    expect(batch.requests.length).toBeGreaterThan(0);
    expect(batch.impressionToken).toBeDefined();
    expect(batch.dailyHeadline).toContain('thoughtful requests today');
  });

  it('submits a structured perspective response and delivers it', async () => {
    const batch = await client.getExploreBatch();
    const target = batch.requests[0];

    const response = await client.submitResponse({
      requestId: target.id,
      firstImpression: 'Natural, poised and approachable',
      reason: 'The relaxed posture makes the conversation feel easy.',
      suggestion: 'Maintain this natural framing.',
      tags: ['natural', 'approachable'],
      tone: 'constructive',
      connectionIntent: 'friends',
      impressionToken: batch.impressionToken,
      idempotencyKey: '00000000-0000-0000-0000-000000000002',
    });

    expect(response.id).toBeDefined();
    expect(response.status).toBe('delivered');
  });

  it('creates mutual connection only when compatible intent is shared', async () => {
    const inbox = await client.getInbox();
    expect(inbox.length).toBeGreaterThan(0);
    const item = inbox[0]; // has connectionIntent: 'network'

    // When user responds with matching 'network' intent
    const result = await client.submitFeedback({
      responseId: item.id,
      rating: 'helpful',
      connectionIntent: 'network',
      idempotencyKey: '00000000-0000-0000-0000-000000000003',
    });

    expect(result.success).toBe(true);
    expect(result.connectionCreated).toBeDefined();
    expect(result.connectionCreated?.mode).toBe('network');
  });

  it('blocks a user bidirectionally and excludes their connections', async () => {
    const initialConnections = await client.getConnections();
    expect(initialConnections.length).toBeGreaterThan(0);

    const partnerId = initialConnections[0].partner.id;
    await client.blockUser({
      blockedUserId: partnerId,
      idempotencyKey: '00000000-0000-0000-0000-000000000004',
    });

    const afterConnections = await client.getConnections();
    expect(afterConnections.some((c) => c.partner.id === partnerId)).toBe(false);
  });

  it('enforces deletion confirmation phrase for DPDP account removal', async () => {
    await expect(
      client.deleteAccount({
        confirmationPhrase: 'WRONG_PHRASE' as any,
        idempotencyKey: '00000000-0000-0000-0000-000000000005',
      })
    ).rejects.toThrow('Confirmation phrase mismatch');

    const result = await client.deleteAccount({
      confirmationPhrase: 'DELETE MY ACCOUNT',
      idempotencyKey: '00000000-0000-0000-0000-000000000006',
    });

    expect(result.success).toBe(true);
    const me = await client.getMe();
    expect(me.publicProfile.status).toBe('deleted');
  });
});
