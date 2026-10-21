import { INestApplication } from '@nestjs/common';
import { totpCode } from '../../src/admin/totp';
import { hashPassword } from '../../src/auth/passwords';
import { PrismaService } from '../../src/prisma/prisma.service';
import { DailyPushScheduler, LogPushSender, PushSender, PushService } from '../../src/push/push.service';
import { Client, createApp, ensureGave, give, liveUser, resetDb } from './harness';

type Live = Client & { postIds: string[] };
const DAY = 86400000;

/** Beta step 5: push notifications for all seven events (placeholder texts, decided 2026-10-21). */
describe('push notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sender: LogPushSender;
  let push: PushService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    sender = app.get(PushSender) as LogPushSender;
    push = app.get(PushService);
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDb(prisma);
    sender.sent.length = 0;
  });

  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 40 };
  const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 40 };
  const tokenOf = (name: string) => `ExponentPushToken[${name}-device]`;

  async function withDevice(c: Live, name: string) {
    await c.post('/v1/me/push-tokens', { token: tokenOf(name), platform: 'ios' }).expect(204);
    return c;
  }
  async function pushesTo(name: string) {
    await push.drain();
    return sender.sent.filter((m) => m.to === tokenOf(name));
  }
  async function unlock(ownerIds: string[]) {
    await prisma.perspective.updateMany({ where: { ownerId: { in: ownerIds } }, data: { receivedDayKey: '2000-01-01' } });
    await prisma.connectRequest.updateMany({ where: { receiverId: { in: ownerIds } }, data: { receivedDayKey: '2000-01-01' } });
    await prisma.dailyProgress.createMany({ data: ownerIds.map((userId) => ({ userId, dayKey: '2000-01-01', requiredCount: 0, unlockedAt: new Date() })) });
  }

  it('registers a device, refuses something that is not an Expo token, and removes it on sign-out', async () => {
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen });
    await ravi.post('/v1/me/push-tokens', { token: 'not-a-token', platform: 'ios' }).expect(400);
    await withDevice(ravi, 'ravi');
    expect(await prisma.pushToken.count({ where: { userId: ravi.id } })).toBe(1);
    await ravi.delete('/v1/me/push-tokens').send({ token: tokenOf('ravi') }).expect(204);
    expect(await prisma.pushToken.count()).toBe(0);
  });

  it('pushes perspectives, connect requests, connections and messages without their text', async () => {
    const meera = await withDevice(await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen }), 'meera');
    const ravi = await withDevice(await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen }), 'ravi');

    await give(meera, ravi.postIds[0], { connect: true }).expect(201);
    const toRavi = await pushesTo('ravi');
    expect(toRavi.map((m) => m.body)).toEqual([
      'Someone wants to connect with you.',
      'You got a new perspective. Finish today’s set to read it.',
    ]);
    expect(JSON.stringify(toRavi)).not.toContain('Meera');

    await unlock([ravi.id]);
    const inbox = await ravi.get('/v1/inbox').expect(200);
    await ensureGave(ravi, meera);
    const conn = await ravi.post(`/v1/connect-requests/${inbox.body.connectRequests[0].id}/accept`).expect(200);
    expect((await pushesTo('meera')).map((m) => [m.body, m.data])).toEqual([
      ['You got a new perspective. Finish today’s set to read it.', { screen: 'inbox' }],
      ['You and Ravi are connected. Say hi!', { screen: 'chat', connectionId: conn.body.id }],
    ]);

    sender.sent.length = 0;
    await ravi.post(`/v1/connections/${conn.body.id}/messages`, { text: 'A secret plan for Sunday' }).expect(201);
    const msg = await pushesTo('meera');
    expect(msg).toEqual([expect.objectContaining({ title: 'Ravi', body: 'Ravi sent you a message.' })]);
    expect(JSON.stringify(msg)).not.toContain('secret');
  });

  it('nudges both people once when nobody has written, and the quiet person once when someone is waiting', async () => {
    const meera = await withDevice(await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen }), 'meera');
    const ravi = await withDevice(await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen }), 'ravi');
    await give(meera, ravi.postIds[0], { connect: true }).expect(201);
    await unlock([ravi.id]);
    const inbox = await ravi.get('/v1/inbox').expect(200);
    await ensureGave(ravi, meera);
    const conn = await ravi.post(`/v1/connect-requests/${inbox.body.connectRequests[0].id}/accept`).expect(200);
    sender.sent.length = 0;

    await prisma.connection.update({ where: { id: conn.body.id }, data: { connectedAt: new Date(Date.now() - 2.5 * DAY) } });
    await ravi.get('/v1/connections').expect(200);
    await meera.get('/v1/connections').expect(200);
    expect((await pushesTo('ravi')).map((m) => m.body)).toEqual(['Say hi to Meera. This connection closes soon if nobody writes.']);
    expect((await pushesTo('meera')).map((m) => m.body)).toEqual(['Say hi to Ravi. This connection closes soon if nobody writes.']);

    // Meera writes; Ravi opened the chat 25 hours ago and has not replied.
    await prisma.connection.update({ where: { id: conn.body.id }, data: { connectedAt: new Date(Date.now() - 1 * DAY) } });
    await meera.post(`/v1/connections/${conn.body.id}/messages`, { text: 'Hi!' }).expect(201);
    await prisma.connection.update({ where: { id: conn.body.id }, data: { firstReplySeenAt: new Date(Date.now() - 25 * 3600000) } });
    sender.sent.length = 0;
    await meera.get('/v1/connections').expect(200);
    await meera.get('/v1/connections').expect(200);
    expect((await pushesTo('ravi')).map((m) => m.body)).toEqual(['Meera is waiting. This connection closes in about a day if you don’t reply.']);
    expect(await pushesTo('meera')).toEqual([]);
  });

  it('sends the daily reminder once, after the set hour, to recent users who have not opened the app today', async () => {
    const ravi = await withDevice(await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen }), 'ravi');
    const away = await withDevice(await liveUser(app, { name: 'Away', gender: 'man', audience: intoWomen }), 'away');
    const today = await withDevice(await liveUser(app, { name: 'Today', gender: 'man', audience: intoWomen }), 'today');
    const scheduler = app.get(DailyPushScheduler);
    // 10:00 in India time today; 06:00 the same day is before the hour.
    const now = new Date();
    const ist = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 30));
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(ist);
    const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ist.getTime() - DAY));
    await prisma.dailyProgress.createMany({
      data: [
        { userId: ravi.id, dayKey: yesterday, requiredCount: 0 },
        { userId: today.id, dayKey, requiredCount: 0 },
      ],
    });
    expect(away.id).toBeTruthy(); // never opened the app: no reminder

    expect(await scheduler.run(new Date(ist.getTime() - 4 * 3600000))).toBe(0);
    expect(await scheduler.run(ist)).toBe(1);
    await scheduler.run(new Date(ist.getTime() + 3600000));
    expect((await pushesTo('ravi')).map((m) => [m.body, m.data.screen])).toEqual([['Your profiles for today are ready.', 'explore']]);
    expect(await pushesTo('away')).toEqual([]);
    expect(await pushesTo('today')).toEqual([]);
  });

  it('tells a banned person about account updates only, and switches off devices Expo no longer knows', async () => {
    const meera = await withDevice(await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen }), 'meera');
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen });
    const secret = 'JBSWY3DPEHPK3PXP';
    await prisma.adminUser.create({ data: { email: 'a@admin.test', passwordHash: await hashPassword('admin-pass-123'), totpSecret: secret } });
    const session = await (await import('supertest'))
      .default(app.getHttpServer())
      .post('/v1/admin/session')
      .send({ email: 'a@admin.test', password: 'admin-pass-123', code: totpCode(secret, new Date()) })
      .expect(200);
    const admin = new Client(app, session.body.accessToken, 'admin');
    await admin.post(`/v1/admin/people/${meera.id}/actions`, { action: 'ban_temporary', reason: 'Spam messages to many people' }).expect(200);
    expect((await pushesTo('meera')).map((m) => [m.body, m.data.screen])).toEqual([['There’s an update about your account.', 'account']]);

    // While banned, ordinary pushes (like a new perspective) are not sent to her.
    sender.sent.length = 0;
    await prisma.user.update({ where: { id: meera.id }, data: { status: 'active' } });
    await give(ravi, meera.postIds[0]).expect(201);
    await prisma.user.update({ where: { id: meera.id }, data: { status: 'suspended' } });
    await push.drain();
    sender.sent.length = 0;
    push.notify(meera.id, { title: 'x', body: 'not for banned people', data: { screen: 'inbox' } });
    expect(await pushesTo('meera')).toEqual([]);

    // Expo says the device is gone: it is switched off.
    await prisma.user.update({ where: { id: meera.id }, data: { status: 'active' } });
    const original = sender.send.bind(sender);
    sender.send = async (messages) => messages.map(() => ({ status: 'error' as const, details: { error: 'DeviceNotRegistered' } }));
    push.notify(meera.id, { title: 'x', body: 'y', data: { screen: 'inbox' } });
    await push.drain();
    sender.send = original;
    expect((await prisma.pushToken.findFirstOrThrow({ where: { userId: meera.id } })).disabledAt).not.toBeNull();
  });
});
