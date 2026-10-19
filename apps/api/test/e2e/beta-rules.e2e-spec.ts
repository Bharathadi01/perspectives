import { INestApplication } from '@nestjs/common';
import { CandidatesService } from '../../src/daily/candidates.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SocialService } from '../../src/social/social.service';
import { Client, createApp, give, liveUser, resetDb } from './harness';

type Live = Client & { postIds: string[] };
const DAY = 86400000;

/** The beta daily-set rules decided on 2026-10-20 (docs/PRODUCT.md → Daily give-to-get). */
describe('beta daily-set rules (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const saved = { soft: process.env.RECEIVED_SOFT_LIMIT_PER_DAY, connect: process.env.MAX_CONNECT_REQUESTS_PER_DAY };

  beforeAll(async () => {
    // Small limits so the tests stay small: a soft received limit of 2 and 2 connect requests a day.
    process.env.RECEIVED_SOFT_LIMIT_PER_DAY = '2';
    process.env.MAX_CONNECT_REQUESTS_PER_DAY = '2';
    ({ app, prisma } = await createApp());
  });
  afterAll(async () => {
    await app.close();
    process.env.RECEIVED_SOFT_LIMIT_PER_DAY = saved.soft;
    process.env.MAX_CONNECT_REQUESTS_PER_DAY = saved.connect;
  });
  beforeEach(() => resetDb(prisma));

  const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 30 };
  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 35 };
  const woman = (name: string) => liveUser(app, { name, gender: 'woman', audience: intoMen });
  const man = (name: string) => liveUser(app, { name, gender: 'man', audience: intoWomen });
  async function women(prefix: string, n: number): Promise<Live[]> {
    const out: Live[] = [];
    for (let i = 0; i < n; i++) out.push(await woman(`${prefix}${i}`));
    return out;
  }
  async function slotsOf(viewer: Live) {
    return prisma.dailyAssignment.findMany({ where: { userId: viewer.id }, orderBy: { slotIndex: 'asc' } });
  }
  async function giveCurrentCard(viewer: Live) {
    const res = await viewer.get('/v1/explore').expect(200);
    const card = res.body.card;
    const open = card.profile.posts.find((p: { id: string }) => !card.givenPostIds.includes(p.id));
    await give(viewer, open.id).expect(201);
    return card.profile.id as string;
  }

  it('asks for 1, 2 or 3 perspectives by how many people are available (fewer than 6, 6 to 14, 15 or more)', async () => {
    await women('a', 5);
    const one = await man('One');
    expect((await one.get('/v1/explore').expect(200)).body.daily.requiredCount).toBe(1);

    await women('b', 1); // 6 available
    const two = await man('Two');
    expect((await two.get('/v1/explore').expect(200)).body.daily.requiredCount).toBe(2);

    await women('c', 9); // 15 available
    const three = await man('Three');
    expect((await three.get('/v1/explore').expect(200)).body.daily.requiredCount).toBe(3);
    expect(await slotsOf(three)).toHaveLength(3);
  });

  it('boosts only someone with no perspectives in the last 3 days, and otherwise has no boost slot', async () => {
    const six = await women('w', 6);
    const giver = await man('Giver');
    for (const w of six) await give(giver, w.postIds[0]).expect(201);

    const viewer = await man('Viewer');
    await viewer.get('/v1/explore').expect(200);
    const slots = await slotsOf(viewer);
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.slot === 'mandatory')).toBe(true);

    const fresh = await woman('Fresh');
    const second = await man('Second');
    const res = await second.get('/v1/explore').expect(200);
    const boost = (await slotsOf(second)).filter((s) => s.slot === 'boost');
    expect(boost.map((s) => s.targetId)).toEqual([fresh.id]);
    expect(res.body.card.slot).toBe('mandatory');
  });

  it('never puts someone who has not opened the app in 7 days into a set, but can show them after it', async () => {
    const [active] = await women('active', 1);
    const [away] = await women('away', 1);
    // An older account that has not opened the app in the last 7 days.
    await prisma.profile.update({ where: { userId: away.id }, data: { createdAt: new Date(Date.now() - 10 * DAY) } });

    const viewer = await man('Viewer');
    const first = await viewer.get('/v1/explore').expect(200);
    expect(first.body.daily.requiredCount).toBe(1);
    expect((await slotsOf(viewer)).map((s) => s.targetId)).toEqual([active.id]);

    await giveCurrentCard(viewer);
    const after = await viewer.get('/v1/explore').expect(200);
    expect(after.body.daily.unlocked).toBe(true);
    expect(after.body.card.profile.id).toBe(away.id);
    expect(after.body.card.slot).toBe('optional');
  });

  it('stops putting someone into sets after the soft received limit, while give-backs still go through', async () => {
    const [popular] = await women('popular', 1);
    const [other] = await women('other', 1);
    const a = await man('A');
    const b = await man('B');
    await give(a, popular.postIds[0]).expect(201);
    await give(b, popular.postIds[0]).expect(201); // 2 received today: the soft limit in this test

    const viewer = await man('Viewer');
    await viewer.get('/v1/explore').expect(200);
    expect((await slotsOf(viewer)).map((s) => s.targetId)).toEqual([other.id]);

    // She can still receive perspectives people choose to give, including a give-back.
    await give(popular, viewer.postIds[0]).expect(201);
    await give(viewer, popular.postIds[0]).expect(201);
  });

  it('allows at most the daily number of connect requests', async () => {
    const three = await women('x', 3);
    const asker = await man('Asker');
    for (const w of three) await give(asker, w.postIds[0]).expect(201);
    await asker.post('/v1/connect-requests', { receiverId: three[0].id }).expect(201);
    await asker.post('/v1/connect-requests', { receiverId: three[1].id }).expect(201);
    const third = await asker.post('/v1/connect-requests', { receiverId: three[2].id }).expect(429);
    expect(third.body.error.code).toBe('CAP_REACHED');
  });

  it('shows a limited number of profiles after the set and then stops', async () => {
    await women('p', 6);
    const viewer = await man('Viewer');
    const start = await viewer.get('/v1/explore').expect(200);
    expect(start.body.daily.requiredCount).toBe(2);
    await giveCurrentCard(viewer);
    await giveCurrentCard(viewer);

    // 4 people are left: fewer than 6, so 3 more profiles (as many as are left, up to 3).
    const shown: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await viewer.get('/v1/explore').expect(200);
      expect(res.body.card.slot).toBe('optional');
      expect(res.body.remainingInBatch).toBe(3 - i);
      shown.push(res.body.card.profile.id);
      await viewer.post('/v1/explore/skip', { profileId: res.body.card.profile.id }).expect(200);
    }
    expect(new Set(shown).size).toBe(3);
    const done = await viewer.get('/v1/explore').expect(200);
    expect(done.body.card).toBeNull();
  });

  it('counts reports on a post, a perspective or a message against the person who made it', async () => {
    const [target] = await women('target', 1);
    const [clean] = await women('clean', 1);
    const r1 = await man('ReporterOne');
    const r2 = await man('ReporterTwo');
    // One person reports her post; another reports a perspective she wrote them.
    await r1.post('/v1/reports', { targetType: 'post', targetId: target.postIds[0], reason: 'harassment_hate' }).expect(201);
    const given = await give(target, r2.postIds[0]).expect(201);
    await r2.post('/v1/reports', { targetType: 'perspective', targetId: given.body.perspective.id, reason: 'harassment_hate' }).expect(201);

    const viewer = await man('Viewer');
    const person = await app.get(SocialService).person(viewer.id);
    const pool = await app.get(CandidatesService).eligible(person!, new Set());
    expect(pool.find((c) => c.id === target.id)?.recentReporters).toBe(2);
    await viewer.get('/v1/explore').expect(200);
    expect((await slotsOf(viewer)).map((s) => s.targetId)).toEqual([clean.id]);
  });
});
