import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CandidatesService } from '../../src/daily/candidates.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SocialService } from '../../src/social/social.service';
import { Client, LONG_COMMENT, createApp, ensureGave, give, liveUser, resetDb } from './harness';

type Live = Client & { postIds: string[] };

describe('core loop (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  afterAll(() => app.close());

  /** Ravi and Kabir (men, into women 18–30) and four women into men 18–35. Nisha only into women. */
  async function world() {
    await resetDb(prisma);
    const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 30 };
    const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 35 };
    const meera = await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen, extraPosts: 1 });
    const asha = await liveUser(app, { name: 'Asha', gender: 'woman', audience: intoMen });
    const priya = await liveUser(app, { name: 'Priya', gender: 'woman', audience: intoMen });
    const tara = await liveUser(app, { name: 'Tara', gender: 'woman', audience: intoMen });
    const nisha = await liveUser(app, { name: 'Nisha', gender: 'woman', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen, extraPosts: 1 });
    const kabir = await liveUser(app, { name: 'Kabir', gender: 'man', audience: intoWomen });
    return { meera, asha, priya, tara, nisha, ravi, kabir };
  }

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

  it('builds a small set for a small pool and never labels the boost profile', async () => {
    const w = await world();
    // Meera already received a perspective, so she cannot be the boost; the others can.
    await give(w.kabir, w.meera.postIds[0]).expect(201);

    // Four women are available to Ravi: fewer than 6 people means a set of 1.
    const res = await w.ravi.get('/v1/explore').expect(200);
    expect(res.body.daily).toMatchObject({ requiredCount: 1, givenCount: 0, unlocked: false });
    const slots = await prisma.dailyAssignment.findMany({ where: { userId: w.ravi.id } });
    expect(slots).toHaveLength(1);
    expect(slots[0].slot).toBe('boost');
    expect(slots[0].targetId).not.toBe(w.meera.id);
    // Nisha is only into women, so Ravi is never assigned her.
    expect(slots.map((s) => s.targetId)).not.toContain(w.nisha.id);
    // The card looks like any other card in the set.
    expect(res.body.card.slot).toBe('mandatory');
  });

  it('enforces the giving rules', async () => {
    const w = await world();
    const own = await give(w.ravi, w.ravi.postIds[0]).expect(403);
    expect(own.body.error.code).toBe('POST_NOT_ELIGIBLE');

    await give(w.ravi, w.meera.postIds[0]).expect(201);
    const again = await give(w.ravi, w.meera.postIds[0]).expect(409);
    expect(again.body.error.code).toBe('ALREADY_SUBMITTED');
    // A different post by the same person is fine.
    await give(w.ravi, w.meera.postIds[1]).expect(201);

    await w.ravi.post('/v1/perspectives', { postId: w.asha.postIds[0], comment: 'Too short' }).expect(400);
    await give(w.ravi, w.asha.postIds[0], { chips: ['Not a real chip'] }).expect(400);
    const outside = await give(w.ravi, w.nisha.postIds[0]).expect(403);
    expect(outside.body.error.code).toBe('POST_NOT_ELIGIBLE');

    const abusive = await w.ravi
      .post('/v1/perspectives', { postId: w.asha.postIds[0], comment: `${LONG_COMMENT} Honestly just kys.` })
      .expect(422);
    expect(abusive.body.error.code).toBe('MODERATION_FAILED');
  });

  it('brings a profile back on a later day only while it still has a post the viewer has not answered', async () => {
    const w = await world();
    // Yesterday Ravi answered Asha's only post and one of Meera's two posts.
    await give(w.ravi, w.asha.postIds[0]).expect(201);
    await give(w.ravi, w.meera.postIds[0]).expect(201);
    await prisma.perspective.updateMany({ where: { giverId: w.ravi.id }, data: { receivedDayKey: '2000-01-01' } });
    // Giving built yesterday's set; start Ravi's day fresh so today's set is built now.
    await prisma.dailyAssignment.deleteMany({ where: { userId: w.ravi.id } });
    await prisma.dailyProgress.deleteMany({ where: { userId: w.ravi.id } });

    const viewer = await app.get(SocialService).person(w.ravi.id);
    const pool = (await app.get(CandidatesService).eligible(viewer!, new Set())).map((c) => c.id);
    expect(pool).not.toContain(w.asha.id);
    expect(pool).toContain(w.meera.id);

    // Meera's profile still lists both posts and marks the answered one, so Explore can hide it.
    const meera = await w.ravi.get(`/v1/profiles/${w.meera.id}`).expect(200);
    expect(meera.body.givenPostIds).toEqual([w.meera.postIds[0]]);
    expect(meera.body.profile.posts).toHaveLength(2);
  });

  it('keeps received perspectives locked until the daily set is done, then lets the owner accept a connect', async () => {
    const w = await world();
    const given = await give(w.meera, w.ravi.postIds[0], { connect: true }).expect(201);
    expect(given.body.connect).toMatchObject({ status: 'sent' });

    let inbox = await w.ravi.get('/v1/inbox').expect(200);
    expect(inbox.body.lockedCount).toBe(1);
    expect(inbox.body.groups).toHaveLength(0);
    expect(inbox.body.connectRequests).toHaveLength(0);
    const early = await w.ravi.post(`/v1/perspectives/${given.body.perspective.id}/feedback`, { verdict: 'helpful' }).expect(403);
    expect(early.body.error.code).toBe('DAILY_UNLOCK_INCOMPLETE');

    await completeDailySet(w.ravi);

    inbox = await w.ravi.get('/v1/inbox').expect(200);
    expect(inbox.body.daily.unlocked).toBe(true);
    expect(inbox.body.lockedCount).toBe(0);
    expect(inbox.body.groups[0].perspectives[0].comment).toBe(LONG_COMMENT);
    expect(inbox.body.connectRequests).toHaveLength(1);
    expect(inbox.body.connectRequests[0].perspective.id).toBe(given.body.perspective.id);

    const fb = await w.ravi
      .post(`/v1/perspectives/${given.body.perspective.id}/feedback`, { verdict: 'helpful', thankPrivately: true })
      .expect(200);
    expect(fb.body).toEqual({ verdict: 'helpful', reason: null, thanked: true });
    const mine = await w.meera.get('/v1/perspectives/given').expect(200);
    expect(mine.body[0].thanked).toBe(true);
    expect(JSON.stringify(mine.body)).not.toContain('verdict');

    // Chat only opens after accept, and accepting needs a perspective back (both must give).
    expect((await w.ravi.get('/v1/connections').expect(200)).body).toHaveLength(0);
    const requestId = inbox.body.connectRequests[0].id;
    // Ravi's daily set may already have included Meera; this part needs him not to have given yet.
    await prisma.perspective.deleteMany({ where: { giverId: w.ravi.id, ownerId: w.meera.id } });
    const beforeGiving = await w.ravi.get('/v1/inbox').expect(200);
    expect(beforeGiving.body.connectRequests[0].gaveBack).toBe(false);
    const early2 = await w.ravi.post(`/v1/connect-requests/${requestId}/accept`).expect(403);
    expect(early2.body.error.code).toBe('PERSPECTIVE_REQUIRED_BEFORE_ACCEPT');
    await ensureGave(w.ravi, w.meera);
    expect((await w.ravi.get('/v1/inbox').expect(200)).body.connectRequests[0].gaveBack).toBe(true);
    const conn = await w.ravi.post(`/v1/connect-requests/${requestId}/accept`).expect(200);
    expect(conn.body.reply).toMatchObject({ fromUserId: w.ravi.id, comment: LONG_COMMENT });
    await w.ravi.post(`/v1/connections/${conn.body.id}/messages`, { text: 'Hey Meera, thanks!' }).expect(201);
    const msgs = await w.meera.get(`/v1/connections/${conn.body.id}/messages`).expect(200);
    expect(msgs.body.map((m: { text: string }) => m.text)).toEqual(['Hey Meera, thanks!']);
    expect(conn.body.origin.comment).toBe(LONG_COMMENT);

    // Non-members cannot read the conversation.
    await w.kabir.get(`/v1/connections/${conn.body.id}/messages`).expect(404);
  });

  it('gates Connect on a perspective in both directions and applies the 14-day cooldown after a decline', async () => {
    const w = await world();
    await give(w.asha, w.ravi.postIds[0]).expect(201);
    // With only two men available Asha's set is 1, and that give may have finished it. Start her day
    // fresh so the request below is still locked until she gives her set.
    await prisma.dailyAssignment.deleteMany({ where: { userId: w.asha.id } });
    await prisma.dailyProgress.deleteMany({ where: { userId: w.asha.id } });

    // Owner-initiated: Ravi must give Asha a perspective before asking.
    const gated = await w.ravi.post('/v1/connect-requests', { receiverId: w.asha.id }).expect(403);
    expect(gated.body.error.code).toBe('PERSPECTIVE_REQUIRED_BEFORE_CONNECT');
    await give(w.ravi, w.asha.postIds[0]).expect(201);
    const req = await w.ravi.post('/v1/connect-requests', { receiverId: w.asha.id }).expect(201);
    const dup = await w.ravi.post('/v1/connect-requests', { receiverId: w.asha.id }).expect(409);
    expect(dup.body.error.code).toBe('CONNECT_REQUEST_PENDING');

    // Asha only sees (and can answer) the request after finishing her own daily set.
    await w.asha.post(`/v1/connect-requests/${req.body.id}/decline`).expect(403);
    await completeDailySet(w.asha);
    await w.asha.post(`/v1/connect-requests/${req.body.id}/decline`).expect(200);

    const cooling = await w.ravi.post('/v1/connect-requests', { receiverId: w.asha.id }).expect(429);
    expect(cooling.body.error.code).toBe('CONNECT_COOLDOWN_ACTIVE');
    expect(cooling.body.error.details.availableAt).toBeDefined();
    const view = await w.ravi.get(`/v1/profiles/${w.asha.id}`).expect(200);
    expect(view.body.relationship).toMatchObject({ canRequestConnect: false, gaveToThem: true, theyGaveToMe: true });
    expect(view.body.relationship.cooldownUntil).not.toBeNull();

    await prisma.connectRequest.update({
      where: { id: req.body.id },
      data: { respondedAt: new Date(Date.now() - 15 * 86400000) },
    });
    await w.ravi.post('/v1/connect-requests', { receiverId: w.asha.id }).expect(201);
  });

  it('blocks in both directions: no perspectives, no requests, no chat, no Explore', async () => {
    const w = await world();
    await give(w.priya, w.ravi.postIds[0], { connect: true }).expect(201);
    await w.ravi.post(`/v1/blocks/${w.priya.id}`).expect(204);

    const fromPriya = await give(w.priya, w.ravi.postIds[1]).expect(403);
    expect(fromPriya.body.error.code).toBe('POST_NOT_ELIGIBLE');
    const toPriya = await w.ravi.post('/v1/connect-requests', { receiverId: w.priya.id }).expect(403);
    expect(toPriya.body.error.code).toBe('BLOCKED_PAIR');
    const priyaAsks = await w.priya.post('/v1/connect-requests', { receiverId: w.ravi.id }).expect(404);
    expect(priyaAsks.body.error.code).toBe('NOT_FOUND');
    await w.priya.get(`/v1/profiles/${w.ravi.id}`).expect(404);

    const pending = await prisma.connectRequest.findMany({ where: { senderId: w.priya.id, status: 'pending' } });
    expect(pending).toHaveLength(0);
    await w.ravi.get('/v1/explore').expect(200);
    const slots = await prisma.dailyAssignment.findMany({ where: { userId: w.ravi.id, status: 'pending' } });
    expect(slots.map((s) => s.targetId)).not.toContain(w.priya.id);
    const inbox = await w.ravi.get('/v1/inbox').expect(200);
    expect(inbox.body.lockedCount).toBe(0);
  });

  it('replaces a skipped slot, and shrinks the requirement when nobody is left', async () => {
    const w = await world();
    let res = await w.ravi.get('/v1/explore').expect(200);
    expect(res.body.daily.requiredCount).toBe(1);
    const seen = new Set<string>();
    // Four women are eligible: each skip is replaced until nobody is left.
    for (let i = 0; i < 3; i++) {
      seen.add(res.body.card.profile.id);
      res = await w.ravi.post('/v1/explore/skip', { profileId: res.body.card.profile.id }).expect(200);
      expect(res.body.daily.requiredCount).toBe(1);
      expect(seen.has(res.body.card.profile.id)).toBe(false);
    }
    res = await w.ravi.post('/v1/explore/skip', { profileId: res.body.card.profile.id }).expect(200);
    expect(res.body.daily).toMatchObject({ requiredCount: 0, unlocked: true });
    // Everyone was skipped (hidden 2 days), so nothing is left after the set either.
    expect(res.body.card).toBeNull();
  });

  it('deletes an account in-app after re-entering the password', async () => {
    const w = await world();
    await give(w.ravi, w.meera.postIds[0]).expect(201);
    await w.ravi.post('/v1/account/deletion', { password: 'wrong', confirmationPhrase: 'DELETE MY ACCOUNT' }).expect(401);
    await w.ravi.post('/v1/account/deletion', { password: 'perspective123', confirmationPhrase: 'DELETE MY ACCOUNT' }).expect(204);

    await w.ravi.get('/v1/me').expect(401);
    expect(await prisma.perspective.count({ where: { giverId: w.ravi.id } })).toBe(0);
    expect(await prisma.deletionJob.count({ where: { status: 'completed' } })).toBe(1);
    const me = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: (await prisma.user.findFirst({ where: { id: w.meera.id } }))!.email, password: 'perspective123' })
      .expect(200);
    expect(me.body.accessToken).toBeDefined();
  });
});
