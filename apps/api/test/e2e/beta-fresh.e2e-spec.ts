import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Client, createApp, give, liveUser, resetDb } from './harness';

type Live = Client & { postIds: string[] };

/** Fresh people first and the 2-day skip (decided 2026-10-20, docs/PRODUCT.md → Daily give-to-get). */
describe('fresh people first (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 40 };
  const woman = (name: string, extraPosts = 0) => liveUser(app, { name, gender: 'woman', audience: intoMen, extraPosts });
  const viewerMan = () => liveUser(app, { name: 'Viewer', age: 24, gender: 'man', audience: { genders: ['woman'], minAge: 18, maxAge: 40 } });

  async function women(prefix: string, n: number, extraPosts = 0): Promise<Live[]> {
    const out: Live[] = [];
    for (let i = 0; i < n; i++) out.push(await woman(`${prefix}${i}`, extraPosts));
    return out;
  }

  /** The viewer gave each of these people their first post "yesterday", and today starts fresh. */
  async function gaveYesterday(viewer: Live, people: Live[]) {
    for (const p of people) await give(viewer, p.postIds[0]).expect(201);
    await prisma.perspective.updateMany({ where: { giverId: viewer.id }, data: { receivedDayKey: '2000-01-01' } });
    await prisma.dailyAssignment.deleteMany({ where: { userId: viewer.id } });
    await prisma.dailyProgress.deleteMany({ where: { userId: viewer.id } });
  }

  async function giveCurrentCard(viewer: Live): Promise<string> {
    const res = await viewer.get('/v1/explore').expect(200);
    const card = res.body.card;
    const open = card.profile.posts.find((p: { id: string }) => !card.givenPostIds.includes(p.id));
    await give(viewer, open.id).expect(201);
    return card.profile.id;
  }

  it('shows only never-seen people while at least 6 are left, even if someone seen before is a good match', async () => {
    const fresh = await women('f', 8);
    const [returning] = await women('r', 1, 1); // two posts: still has one the viewer has not answered
    const viewer = await viewerMan();
    await gaveYesterday(viewer, [returning]);

    const first = await viewer.get('/v1/explore').expect(200);
    expect(first.body.daily.requiredCount).toBe(2); // 8 fresh people: a set of 2
    const set = await prisma.dailyAssignment.findMany({ where: { userId: viewer.id } });
    expect(set.map((s) => s.targetId)).not.toContain(returning.id);

    const seen = [await giveCurrentCard(viewer), await giveCurrentCard(viewer)];
    // 6 fresh people are left, so the 4 profiles after the set are all fresh.
    for (let i = 0; i < 4; i++) {
      const res = await viewer.get('/v1/explore').expect(200);
      expect(res.body.card.slot).toBe('optional');
      seen.push(res.body.card.profile.id);
      await viewer.post('/v1/explore/skip', { profileId: res.body.card.profile.id }).expect(200);
    }
    expect(seen).not.toContain(returning.id);
    expect(new Set(seen).size).toBe(6);
    expect(seen.every((id) => fresh.some((f) => f.id === id))).toBe(true);
    expect((await viewer.get('/v1/explore').expect(200)).body.card).toBeNull();
  });

  it('adds people seen before when fewer than 6 fresh are left, and the set size follows the combined pool', async () => {
    const fresh = await women('f', 4);
    const returning = await women('r', 3, 1);
    const viewer = await viewerMan();
    await gaveYesterday(viewer, returning);

    const first = await viewer.get('/v1/explore').expect(200);
    // 4 fresh + 3 returning = 7 people: a set of 2 (4 fresh alone would have been a set of 1).
    expect(first.body.daily.requiredCount).toBe(2);

    const given = [await giveCurrentCard(viewer), await giveCurrentCard(viewer)];
    expect(given.every((id) => fresh.some((f) => f.id === id))).toBe(true); // the head start puts fresh people first

    // Then 3 more profiles: the 2 fresh ones left, then someone seen before.
    const after: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await viewer.get('/v1/explore').expect(200);
      after.push(res.body.card.profile.id);
      // Seen-before profiles show only the post not answered yet.
      expect(res.body.card.givenPostIds.length).toBe(returning.some((r) => r.id === res.body.card.profile.id) ? 1 : 0);
      await viewer.post('/v1/explore/skip', { profileId: res.body.card.profile.id }).expect(200);
    }
    expect(after.slice(0, 2).every((id) => fresh.some((f) => f.id === id))).toBe(true);
    expect(returning.map((r) => r.id)).toContain(after[2]);
    expect((await viewer.get('/v1/explore').expect(200)).body.card).toBeNull();
  });

  it('keeps a skipped profile hidden for 2 days, then shows it again', async () => {
    const [only] = await women('only', 1);
    const viewer = await viewerMan();
    const first = await viewer.get('/v1/explore').expect(200);
    expect(first.body.card.profile.id).toBe(only.id);
    const done = await viewer.post('/v1/explore/skip', { profileId: only.id }).expect(200);
    expect(done.body.card).toBeNull();

    const newDay = async (skippedDaysAgo: number) => {
      await prisma.profileSkip.updateMany({ where: { viewerId: viewer.id }, data: { createdAt: new Date(Date.now() - skippedDaysAgo * 86400000) } });
      await prisma.dailyAssignment.deleteMany({ where: { userId: viewer.id } });
      await prisma.dailyProgress.deleteMany({ where: { userId: viewer.id } });
      return viewer.get('/v1/explore').expect(200);
    };
    expect((await newDay(1)).body.card).toBeNull(); // skipped yesterday: still hidden
    expect((await newDay(3)).body.card.profile.id).toBe(only.id); // skipped 3 days ago: back
  });
});
