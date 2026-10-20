import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from '../../src/auth/passwords';
import { generateTotpSecret, totpCode } from '../../src/admin/totp';
import { CandidatesService } from '../../src/daily/candidates.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SocialService } from '../../src/social/social.service';
import { Client, createApp, ensureGave, give, liveUser, resetDb, signUp } from './harness';

type Live = Client & { postIds: string[] };
const DAY = 86400000;

/** Beta step 3 (docs/PRODUCT.md → Reports, holds and bans; docs/SECURITY.md → Admin access). */
describe('holds, bans, appeals, the admin API and weak givers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  const savedRequireCode = process.env.ADMIN_REQUIRE_CODE;
  beforeAll(async () => {
    // The authenticator code is checked in this file; development has it switched off (decided 2026-10-21).
    process.env.ADMIN_REQUIRE_CODE = 'true';
    ({ app, prisma } = await createApp());
  });
  afterAll(async () => {
    await app.close();
    process.env.ADMIN_REQUIRE_CODE = savedRequireCode;
  });
  beforeEach(() => resetDb(prisma));

  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 40 };
  const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 40 };
  const woman = (name: string, extraPosts = 0) => liveUser(app, { name, gender: 'woman', audience: intoMen, extraPosts });
  const man = (name: string, extraPosts = 0) => liveUser(app, { name, gender: 'man', audience: intoWomen, extraPosts });

  /** An admin made the way the server command makes one, signed in with a fresh authenticator code. */
  async function admin(email = 'jana@admin.test'): Promise<Client> {
    const secret = generateTotpSecret();
    const row = await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword('admin-pass-123'), totpSecret: secret } });
    const res = await http()
      .post('/v1/admin/session')
      .send({ email, password: 'admin-pass-123', code: totpCode(secret, new Date()) })
      .expect(200);
    return new Client(app, res.body.accessToken, row.id);
  }

  const report = (by: Client, targetId: string, reason = 'harassment_hate', targetType = 'profile') =>
    by.post('/v1/reports', { targetType, targetId, reason });

  /** Lets an owner act on what they received without doing a daily set first. */
  async function unlockReceived(ownerIds: string[]) {
    await prisma.perspective.updateMany({ where: { ownerId: { in: ownerIds } }, data: { receivedDayKey: '2000-01-01' } });
    await prisma.connectRequest.updateMany({ where: { receiverId: { in: ownerIds } }, data: { receivedDayKey: '2000-01-01' } });
    await prisma.dailyProgress.createMany({ data: ownerIds.map((userId) => ({ userId, dayKey: '2000-01-01', requiredCount: 0, unlockedAt: new Date() })) });
  }

  describe('admin sign-in', () => {
    it('needs the password and a fresh 6-digit code, and keeps admin and user tokens apart', async () => {
      const secret = generateTotpSecret();
      await prisma.adminUser.create({ data: { email: 'a@admin.test', passwordHash: await hashPassword('admin-pass-123'), totpSecret: secret } });
      const code = totpCode(secret, new Date());
      await http().post('/v1/admin/session').send({ email: 'a@admin.test', password: 'wrong', code }).expect(401);
      const wrongCode = code === '000000' ? '111111' : '000000';
      await http().post('/v1/admin/session').send({ email: 'a@admin.test', password: 'admin-pass-123', code: wrongCode }).expect(401);
      const ok = await http().post('/v1/admin/session').send({ email: 'a@admin.test', password: 'admin-pass-123', code }).expect(200);
      expect(ok.body.expiresIn).toBe(8 * 3600);
      // The same code cannot be used twice.
      await http().post('/v1/admin/session').send({ email: 'a@admin.test', password: 'admin-pass-123', code }).expect(401);

      const user = await signUp(app, 'user@test.local');
      await http().get('/v1/admin/queue').expect(401);
      await http().get('/v1/admin/queue').set('authorization', `Bearer ${user.token}`).expect(401);
      await http().get('/v1/me').set('authorization', `Bearer ${ok.body.accessToken}`).expect(401);
      await http().get('/v1/admin/queue').set('authorization', `Bearer ${ok.body.accessToken}`).expect(200);
      expect(await prisma.adminAuditEntry.count({ where: { action: 'sign_in' } })).toBe(1);
    });

    it('signs in with the password alone while codes are switched off (the development default)', async () => {
      process.env.ADMIN_REQUIRE_CODE = 'false';
      const { app: devApp, prisma: devPrisma } = await createApp();
      process.env.ADMIN_REQUIRE_CODE = 'true';
      try {
        await devPrisma.adminUser.create({ data: { email: 'dev@admin.test', passwordHash: await hashPassword('admin-pass-123'), totpSecret: generateTotpSecret() } });
        const dev = () => request(devApp.getHttpServer());
        await dev().post('/v1/admin/session').send({ email: 'dev@admin.test', password: 'wrong' }).expect(401);
        const ok = await dev().post('/v1/admin/session').send({ email: 'dev@admin.test', password: 'admin-pass-123' }).expect(200);
        await dev().get('/v1/admin/queue').set('authorization', `Bearer ${ok.body.accessToken}`).expect(200);
        // The other app (codes on) still refuses a missing code.
        await http().post('/v1/admin/session').send({ email: 'dev@admin.test', password: 'admin-pass-123' }).expect(401);
      } finally {
        await devApp.close();
      }
    });
  });

  describe('holds', () => {
    it('hides someone from new people after 3 different reporters, without telling them, until an admin dismisses', async () => {
      const target = await woman('Target');
      const viewer = await man('Viewer');
      const [r1, r2, r3] = [await man('R1'), await man('R2'), await man('R3')];
      await report(r1, target.id).expect(201);
      await report(r2, target.id).expect(201);
      expect(await prisma.reviewCase.count()).toBe(0);
      await report(r3, target.id).expect(201);
      expect(await prisma.reviewCase.findMany()).toEqual([expect.objectContaining({ userId: target.id, reason: 'reporters', hides: true })]);

      // Hidden from Explore and from her profile page for people who don't know her.
      const res = await viewer.get('/v1/explore').expect(200);
      expect(res.body.card).toBeNull();
      await viewer.get(`/v1/profiles/${target.id}`).expect(404);
      // She can still use the app and is not told.
      await target.get('/v1/explore').expect(200);
      expect((await target.get('/v1/notices').expect(200)).body.notices).toEqual([]);

      const a = await admin();
      const queue = await a.get('/v1/admin/queue').expect(200);
      expect(queue.body).toEqual([expect.objectContaining({ userId: target.id, reason: 'reporters', hidden: true, distinctReporters: 3 })]);
      const detail = await a.get(`/v1/admin/people/${target.id}`).expect(200);
      expect(detail.body.reports).toHaveLength(3);
      expect(await prisma.adminAuditEntry.count({ where: { action: 'view_case', targetUserId: target.id } })).toBe(1);

      await a.post(`/v1/admin/people/${target.id}/actions`, { action: 'dismiss', reason: 'Reports were not about rule breaking' }).expect(200);
      expect((await a.get('/v1/admin/queue').expect(200)).body).toEqual([]);
      // Dismissed reports stop counting, so she is shown again.
      expect((await viewer.get(`/v1/profiles/${target.id}`).expect(200)).body.profile.id).toBe(target.id);
      const viewerPerson = await app.get(SocialService).person(viewer.id);
      const pool = await app.get(CandidatesService).eligible(viewerPerson!, new Set());
      expect(pool.find((c) => c.id === target.id)?.recentReporters).toBe(0);
    });

    it('holds at once for one serious report from a verified account, and puts it first in the list', async () => {
      const [bad, other] = [await woman('Bad'), await woman('Other')];
      const [r1, r2, r3] = [await man('R1'), await man('R2'), await man('R3')];
      for (const r of [r1, r2, r3]) await report(r, other.id).expect(201);
      await report(r1, bad.postIds[0], 'nudity_sexual', 'post').expect(201);
      const a = await admin();
      const queue = await a.get('/v1/admin/queue').expect(200);
      expect(queue.body.map((q: { userId: string; reason: string }) => [q.userId, q.reason])).toEqual([
        [bad.id, 'serious_report'],
        [other.id, 'reporters'],
      ]);
      const detail = await a.get(`/v1/admin/people/${bad.id}`).expect(200);
      expect(detail.body.reports[0].content.mediaUrl).toMatch(/^\/v1\/media\//);
    });

    it('turns "sexual" and "unsafe" marks into serious reports and "insulting" into one report', async () => {
      const [owner1, owner2] = [await woman('Owner1'), await woman('Owner2')];
      const [rude, creep] = [await man('Rude'), await man('Creep')];
      const p1 = (await give(rude, owner1.postIds[0]).expect(201)).body.perspective.id;
      const p2 = (await give(creep, owner2.postIds[0]).expect(201)).body.perspective.id;
      await unlockReceived([owner1.id, owner2.id]);

      await owner1.post(`/v1/perspectives/${p1}/feedback`, { verdict: 'not_helpful', reason: 'insulting' }).expect(200);
      await owner2.post(`/v1/perspectives/${p2}/feedback`, { verdict: 'not_helpful', reason: 'sexual' }).expect(200);

      const reports = await prisma.report.findMany({ orderBy: { createdAt: 'asc' } });
      expect(reports.map((r) => [r.subjectId, r.reason, r.fromFeedback])).toEqual([
        [rude.id, 'body_shaming', true],
        [creep.id, 'nudity_sexual', true],
      ]);
      const cases = await prisma.reviewCase.findMany();
      expect(cases.map((c) => [c.userId, c.reason])).toEqual([[creep.id, 'serious_report']]);
    });
  });

  describe('bans and appeals', () => {
    async function connectedPair() {
      const meera = await woman('Meera');
      const ravi = await man('Ravi');
      await give(meera, ravi.postIds[0], { connect: true }).expect(201);
      await unlockReceived([ravi.id]);
      const inbox = await ravi.get('/v1/inbox').expect(200);
      await ensureGave(ravi, meera);
      const conn = await ravi.post(`/v1/connect-requests/${inbox.body.connectRequests[0].id}/accept`).expect(200);
      return { meera, ravi, connectionId: conn.body.id as string };
    }

    it('a 3-day ban: sign-in works, only the ban screen, chats paused, one appeal, extend, restore', async () => {
      const { meera, ravi, connectionId } = await connectedPair();
      const a = await admin();
      await a.post(`/v1/admin/people/${meera.id}/actions`, { action: 'ban_temporary', reason: 'Harassing other members' }).expect(200);

      // She can sign in, but every normal screen is refused.
      expect((await meera.get('/v1/me').expect(403)).body.error.code).toBe('ACCOUNT_SUSPENDED');
      const screen = await meera.get('/v1/account/restriction').expect(200);
      expect(screen.body).toMatchObject({ status: 'suspended', reason: 'Harassing other members', appeal: null, canAppeal: true });
      expect(new Date(screen.body.endsAt).getTime()).toBeGreaterThan(Date.now() + 2.9 * DAY);
      // Her profile is hidden and the chat is paused for Ravi.
      await ravi.get(`/v1/profiles/${meera.id}`).expect(404);
      const send = await ravi.post(`/v1/connections/${connectionId}/messages`, { text: 'Hello?' }).expect(409);
      expect(send.body.error.code).toBe('CONNECTION_PAUSED');

      // One appeal per ban.
      await meera.post('/v1/account/appeal', { message: 'This was a mistake, I was joking with a friend.' }).expect(200);
      const second = await meera.post('/v1/account/appeal', { message: 'Please look again at my case.' }).expect(409);
      expect(second.body.error.code).toBe('APPEAL_NOT_ALLOWED');
      const queue = await a.get('/v1/admin/queue').expect(200);
      expect(queue.body[0]).toMatchObject({ userId: meera.id, reason: 'appeal' });
      const detail = await a.get(`/v1/admin/people/${meera.id}`).expect(200);
      const appealId = detail.body.bans[0].appeal.id;
      await a.post(`/v1/admin/appeals/${appealId}/decision`, { decision: 'uphold', reason: 'The messages were clearly hostile' }).expect(200);
      const upheld = await meera.get('/v1/account/restriction').expect(200);
      expect(upheld.body).toMatchObject({ canAppeal: false, appeal: { status: 'upheld', decisionReason: 'The messages were clearly hostile' } });

      // Extending is a new ban with 3 more days, so it can be appealed once again.
      await a.post(`/v1/admin/people/${meera.id}/actions`, { action: 'extend', reason: 'Kept harassing after the first ban' }).expect(200);
      const extended = await meera.get('/v1/account/restriction').expect(200);
      expect(extended.body).toMatchObject({ canAppeal: true, appeal: null, reason: 'Kept harassing after the first ban' });
      expect(new Date(extended.body.endsAt).getTime()).toBeGreaterThan(Date.now() + 5.9 * DAY);

      await a.post(`/v1/admin/people/${meera.id}/actions`, { action: 'restore', reason: 'Reviewed again, lifting the ban' }).expect(200);
      await meera.get('/v1/me').expect(200);
      const notices = await meera.get('/v1/notices').expect(200);
      expect(notices.body.notices[0]).toMatchObject({ kind: 'account_restored', reason: 'Reviewed again, lifting the ban' });
      const actions = await prisma.adminAuditEntry.findMany({ where: { targetUserId: meera.id, action: { not: 'view_case' } }, orderBy: { createdAt: 'asc' } });
      expect(actions.map((x) => x.action)).toEqual(['ban_temporary', 'appeal_upheld', 'extend', 'restore']);
    });

    it('ends a temporary ban by itself when the date passes', async () => {
      const meera = await woman('Meera');
      const a = await admin();
      await a.post(`/v1/admin/people/${meera.id}/actions`, { action: 'ban_temporary', reason: 'Spam messages' }).expect(200);
      await meera.get('/v1/me').expect(403);
      await prisma.user.update({ where: { id: meera.id }, data: { suspendedUntil: new Date(Date.now() - 1000) } });
      await meera.get('/v1/me').expect(200);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: meera.id } })).status).toBe('active');
    });

    it('a permanent ban: banned screen, account deletion still works, and the email cannot sign up again', async () => {
      const meera = await woman('Meera');
      const email = (await prisma.user.findUniqueOrThrow({ where: { id: meera.id } })).email;
      const a = await admin();
      await a.post(`/v1/admin/people/${meera.id}/actions`, { action: 'ban_permanent', reason: 'Threats to another member' }).expect(200);
      expect((await meera.get('/v1/explore').expect(403)).body.error.code).toBe('ACCOUNT_BANNED');
      const screen = await meera.get('/v1/account/restriction').expect(200);
      expect(screen.body).toMatchObject({ status: 'banned', endsAt: null, canAppeal: true });
      await meera.post('/v1/account/deletion', { password: 'perspective123', confirmationPhrase: 'DELETE MY ACCOUNT' }).expect(204);
      const again = await http()
        .post('/v1/auth/signup')
        .send({ email, password: 'perspective123', birthDate: '1999-01-01', acceptTerms: true })
        .expect(403);
      expect(again.body.error.code).toBe('EMAIL_BLOCKED');
    });
  });

  describe('weak givers (fixed 60% line)', () => {
    it('sends a private tip, pushes them back, keeps brand-new members out of their set, then flags them', async () => {
      const giver = await man('Lazy', 0);
      const owners: Live[] = [];
      for (let i = 0; i < 6; i++) owners.push(await woman(`Owner${i}`, 2)); // 6 people x 3 posts = 18 posts
      const ids: string[] = [];
      for (const o of owners) for (const postId of o.postIds) ids.push((await give(giver, postId).expect(201)).body.perspective.id);
      await unlockReceived(owners.map((o) => o.id));

      const viewer = await woman('Viewer');
      const score = async () => {
        const p = await app.get(SocialService).person(viewer.id);
        return (await app.get(CandidatesService).eligible(p!, new Set())).find((c) => c.id === giver.id)!.score;
      };
      const before = await score();

      // 8 "vague" marks from 6 different people: over the line, so a private tip.
      const ownerOf = (i: number) => owners[Math.floor(i / 3)];
      const mark = (i: number) => ownerOf(i).post(`/v1/perspectives/${ids[i]}/feedback`, { verdict: 'not_helpful', reason: 'vague' }).expect(200);
      const order = [0, 3, 6, 9, 12, 15, 1, 4]; // spread across all 6 owners first
      for (const i of order.slice(0, 7)) await mark(i);
      expect((await giver.get('/v1/notices').expect(200)).body.notices).toEqual([]);
      await mark(order[7]);
      const notices = await giver.get('/v1/notices').expect(200);
      expect(notices.body.notices).toEqual([expect.objectContaining({ kind: 'weak_giver_tip' })]);
      expect((await prisma.giverQuality.findUniqueOrThrow({ where: { userId: giver.id } })).weak).toBe(true);
      expect(before - (await score())).toBeGreaterThan(0.2 - 1e-9);

      // A weak giver's daily set skips brand-new members: only the older member can be in it.
      const older = owners[5];
      await prisma.profile.update({ where: { userId: older.id }, data: { createdAt: new Date(Date.now() - 10 * DAY) } });
      await prisma.dailyProgress.create({ data: { userId: older.id, dayKey: '2099-01-01', requiredCount: 0 } }); // counts as active
      await prisma.dailyAssignment.deleteMany({ where: { userId: giver.id } });
      await prisma.dailyProgress.deleteMany({ where: { userId: giver.id } });
      await giver.get('/v1/explore').expect(200);
      const set = await prisma.dailyAssignment.findMany({ where: { userId: giver.id } });
      expect(set.every((s) => s.targetId === older.id)).toBe(true);

      // 10 more low-effort marks while still over the line: on the admin's list.
      const rest = [...Array(18).keys()].filter((i) => !order.includes(i));
      for (const i of rest) await mark(i);
      const a = await admin();
      const queue = await a.get('/v1/admin/queue').expect(200);
      expect(queue.body).toEqual([expect.objectContaining({ userId: giver.id, reason: 'weak_giver', hidden: false })]);
    });
  });
});
