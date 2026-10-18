import { INestApplication } from '@nestjs/common';
import { ConnectService } from '../../src/connect/connect.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Client, createApp, ensureGave, give, liveUser, resetDb } from './harness';

type Live = Client & { postIds: string[] };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('connected moment and quiet connections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  afterAll(() => app.close());

  async function completeDailySet(user: Live): Promise<void> {
    for (let i = 0; i < 10; i++) {
      const res = await user.get('/v1/explore').expect(200);
      if (res.body.daily.unlocked || !res.body.card) return;
      const target = res.body.card.profile;
      const open = target.posts.find((p: { id: string }) => !res.body.card.givenPostIds.includes(p.id));
      await give(user, open.id).expect(201);
    }
    throw new Error('daily set did not complete');
  }

  /** Meera asks Ravi to connect with her perspective; Ravi accepts. Returns the connection id. */
  async function connected() {
    await resetDb(prisma);
    const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 30 };
    const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 35 };
    const meera = await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen });
    await liveUser(app, { name: 'Asha', gender: 'woman', audience: intoMen });
    await liveUser(app, { name: 'Tara', gender: 'woman', audience: intoMen });
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen });
    await give(meera, ravi.postIds[0], { connect: true }).expect(201);
    await completeDailySet(ravi);
    const inbox = await ravi.get('/v1/inbox').expect(200);
    await ensureGave(ravi, meera);
    const conn = await ravi.post(`/v1/connect-requests/${inbox.body.connectRequests[0].id}/accept`).expect(200);
    return { meera, ravi, id: conn.body.id as string, accepted: conn.body };
  }

  async function backdate(id: string, data: { connectedAt?: Date; firstReplySeenAt?: Date }) {
    await prisma.connection.update({ where: { id }, data });
  }

  it('shows the connected moment once: right away to the person who accepts, later to the one who asked', async () => {
    const { meera, ravi, id, accepted } = await connected();
    expect(accepted.isNew).toBe(false);
    expect(accepted.origin.postCategory).toBe('style');

    expect((await ravi.get('/v1/connections/unseen').expect(200)).body).toHaveLength(0);
    const unseen = await meera.get('/v1/connections/unseen').expect(200);
    expect(unseen.body.map((c: { id: string }) => c.id)).toEqual([id]);
    expect(unseen.body[0].isNew).toBe(true);

    // Someone else cannot mark it seen for her.
    await ravi.post('/v1/connections/seen', { connectionIds: [id] }).expect(204);
    expect((await meera.get('/v1/connections/unseen').expect(200)).body).toHaveLength(1);

    await meera.post('/v1/connections/seen', { connectionIds: [id] }).expect(204);
    await meera.post('/v1/connections/seen', { connectionIds: [id] }).expect(204);
    expect((await meera.get('/v1/connections/unseen').expect(200)).body).toHaveLength(0);
  });

  it('counts opening the chat as seeing the connected moment', async () => {
    const { meera, id } = await connected();
    await meera.get(`/v1/connections/${id}/messages`).expect(200);
    expect((await meera.get('/v1/connections/unseen').expect(200)).body).toHaveLength(0);
  });

  it('warns the quiet person 24 hours after they opened the chat and closes at 48, without telling the sender it was seen', async () => {
    const { meera, ravi, id } = await connected();
    await ravi.post(`/v1/connections/${id}/messages`, { text: 'Hey Meera, thanks for the honest take!' }).expect(201);

    // Not opened yet: no clock, and Ravi is simply waiting.
    expect((await ravi.get('/v1/connections').expect(200)).body[0].expiry).toEqual({ state: 'waiting', closesAt: null });
    await meera.get(`/v1/connections/${id}/messages`).expect(200);
    const row = await prisma.connection.findUniqueOrThrow({ where: { id } });
    expect(row.firstReplySeenAt).not.toBeNull();
    expect((await meera.get('/v1/connections').expect(200)).body[0].expiry).toEqual({ state: 'ok', closesAt: null });

    await backdate(id, { firstReplySeenAt: new Date(Date.now() - 25 * HOUR) });
    const warned = (await meera.get('/v1/connections').expect(200)).body[0];
    expect(warned.expiry.state).toBe('you_owe_reply');
    expect(warned.expiry.closesAt).not.toBeNull();
    expect((await ravi.get('/v1/connections').expect(200)).body[0].expiry).toEqual({ state: 'waiting', closesAt: null });

    await backdate(id, { firstReplySeenAt: new Date(Date.now() - 49 * HOUR) });
    expect((await meera.get('/v1/connections').expect(200)).body).toHaveLength(0);
    const closed = await ravi.post(`/v1/connections/${id}/messages`, { text: 'Still there?' }).expect(410);
    expect(closed.body.error.code).toBe('CONNECTION_CLOSED');
    const after = await prisma.connection.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ status: 'unmatched', closedReason: 'no_reply' });
  });

  it('stops the clock once the quiet person replies', async () => {
    const { meera, ravi, id } = await connected();
    await ravi.post(`/v1/connections/${id}/messages`, { text: 'Hey Meera!' }).expect(201);
    await meera.get(`/v1/connections/${id}/messages`).expect(200);
    await meera.post(`/v1/connections/${id}/messages`, { text: 'Hi Ravi, glad it helped.' }).expect(201);
    await backdate(id, { firstReplySeenAt: new Date(Date.now() - 3 * DAY) });
    const list = (await ravi.get('/v1/connections').expect(200)).body;
    expect(list).toHaveLength(1);
    expect(list[0].expiry).toEqual({ state: 'ok', closesAt: null });
  });

  it('reminds on day 2 and closes on day 3 when nobody writes, then lets either person connect again', async () => {
    const { meera, ravi, id } = await connected();
    await backdate(id, { connectedAt: new Date(Date.now() - 2 * DAY - HOUR) });
    expect((await ravi.get('/v1/connections').expect(200)).body[0].expiry.state).toBe('remind');

    await backdate(id, { connectedAt: new Date(Date.now() - 3 * DAY - HOUR) });
    expect(await app.get(ConnectService).sweepQuietConnections()).toBe(1);
    expect(await prisma.connection.findUniqueOrThrow({ where: { id } })).toMatchObject({ closedReason: 'no_message' });

    // Treated like an unmatch: no cooldown, and the reopened connection starts fresh.
    const view = await ravi.get(`/v1/profiles/${meera.id}`).expect(200);
    expect(view.body.relationship).toMatchObject({ canRequestConnect: true, connectionId: null, cooldownUntil: null });
    const req = await ravi.post('/v1/connect-requests', { receiverId: meera.id }).expect(201);
    await ensureGave(meera, { id: ravi.id, postIds: ravi.postIds });
    const again = await meera.post(`/v1/connect-requests/${req.body.id}/accept`).expect(200);
    expect(again.body.id).toBe(id);
    expect(again.body.closedReason).toBeNull();
    expect(again.body.expiry).toEqual({ state: 'ok', closesAt: null });
    expect((await ravi.get('/v1/connections/unseen').expect(200)).body).toHaveLength(1);
  });

  it('lets the receiver give back and accept in one step by ticking Connect while giving', async () => {
    await resetDb(prisma);
    const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 30 };
    const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 35 };
    const meera = await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen });
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen });
    await give(meera, ravi.postIds[0], { connect: true }).expect(201);
    await completeDailySet(ravi);

    // Ravi may have given to Meera already in his daily set; this test needs him not to have.
    await prisma.perspective.deleteMany({ where: { giverId: ravi.id, ownerId: meera.id } });
    const inbox = await ravi.get('/v1/inbox').expect(200);
    expect(inbox.body.connectRequests[0].gaveBack).toBe(false);

    const res = await give(ravi, meera.postIds[0], { connect: true }).expect(201);
    expect(res.body.connect.status).toBe('connected');
    const conn = (await ravi.get('/v1/connections').expect(200)).body;
    expect(conn).toHaveLength(1);
    expect(conn[0].id).toBe(res.body.connect.connectionId);
    expect(conn[0].isNew).toBe(false);
    expect(conn[0].reply).toMatchObject({ fromUserId: ravi.id });
    // Meera asked, so she still has the connected moment to see.
    expect((await meera.get('/v1/connections/unseen').expect(200)).body).toHaveLength(1);
  });
});
