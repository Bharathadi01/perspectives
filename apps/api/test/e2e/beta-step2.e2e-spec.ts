import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Client, createApp, give, liveUser, resetDb, signUp, uploadPhoto } from './harness';

type Live = Client & { postIds: string[] };

/** Beta step 2 (decided 2026-10-20): the private goal, private optional orientation, automatic age widening and notices. */
describe('goal, orientation and automatic widening (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 40 };
  const womanAged = (name: string, age: number) => liveUser(app, { name, age, gender: 'woman', audience: intoMen });
  async function slotsOf(viewer: Live) {
    return prisma.dailyAssignment.findMany({ where: { userId: viewer.id }, orderBy: { slotIndex: 'asc' } });
  }
  async function chosenRange(viewer: Live) {
    const p = await prisma.profile.findUniqueOrThrow({ where: { userId: viewer.id } });
    return { minAge: p.audienceChosenMinAge, maxAge: p.audienceChosenMaxAge };
  }

  it('needs a goal (one or both) before the profile goes live, and orientation is optional', async () => {
    const c = await signUp(app, 'goal@test.local', 24);
    await c
      .patch('/v1/me', {
        displayName: 'Goal',
        gender: 'man',
        heightCm: 175,
        city: 'Pune',
        audience: { genders: ['woman'], minAge: 18, maxAge: 30 },
      })
      .expect(200);
    await c.post('/v1/me/selfie-verification', { mediaId: await uploadPhoto(c) }).expect(200);
    await c
      .post('/v1/me/posts', { kind: 'photo', mediaId: await uploadPhoto(c), prompt: 'How do I come across?', category: 'looks', focusAreas: ['photo'] })
      .expect(201);
    let me = await c.get('/v1/me').expect(200);
    expect(me.body.missing).toEqual(['goal']);
    expect(me.body.isLive).toBe(false);

    await c.patch('/v1/me', { goals: [] }).expect(400);
    await c.patch('/v1/me', { goals: ['meet_people', 'meet_people'] }).expect(400);
    me = await c.patch('/v1/me', { goals: ['get_perspectives'] }).expect(200);
    expect(me.body.goals).toEqual(['get_perspectives']);
    expect(me.body.orientation).toBeNull();
    expect(me.body.isLive).toBe(true);

    // Orientation can be set and cleared again.
    me = await c.patch('/v1/me', { orientation: 'queer' }).expect(200);
    expect(me.body.orientation).toBe('queer');
    me = await c.patch('/v1/me', { orientation: null }).expect(200);
    expect(me.body.orientation).toBeNull();
    expect(me.body.isLive).toBe(true);
  });

  it('ignores the old dating intention and dealbreaker', async () => {
    const c = await liveUser(app, { name: 'Old', gender: 'man', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
    const me = await c.patch('/v1/me', { datingIntention: 'casual', intentionDealbreaker: true, city: 'Goa' }).expect(200);
    expect(me.body).not.toHaveProperty('datingIntention');
    expect(me.body).not.toHaveProperty('intentionDealbreaker');
    const row = await prisma.profile.findUniqueOrThrow({ where: { userId: c.id } });
    expect(row.datingIntention).toBeNull();
    expect(row.intentionDealbreaker).toBe(false);
  });

  it('widens the age range 2 years at each end when too few people are left, saves it and leaves a notice', async () => {
    const outside = [await womanAged('TwentySeven', 27), await womanAged('TwentyEight', 28)];
    await womanAged('ThirtyOne', 31); // beyond the 4-year limit
    // A man inside every age range: widening never changes genders.
    await liveUser(app, { name: 'Other', age: 25, gender: 'man', audience: { genders: ['man'], minAge: 18, maxAge: 40 } });
    const viewer = await liveUser(app, { name: 'Viewer', age: 24, gender: 'man', audience: { genders: ['woman', 'non_binary'], minAge: 22, maxAge: 26 } });

    const res = await viewer.get('/v1/explore').expect(200);
    expect(res.body.daily.requiredCount).toBe(1);
    const me = await viewer.get('/v1/me').expect(200);
    // 20-28 brought in two people; 18-30 brought nobody more, so the range stops at 20-28.
    expect(me.body.audience).toEqual({ genders: ['woman', 'non_binary'], minAge: 20, maxAge: 28 });
    expect(await chosenRange(viewer)).toEqual({ minAge: 22, maxAge: 26 });
    const assigned = (await slotsOf(viewer)).map((s) => s.targetId);
    expect(outside.map((w) => w.id)).toEqual(expect.arrayContaining(assigned));

    const notices = await viewer.get('/v1/notices').expect(200);
    expect(notices.body.unreadCount).toBe(1);
    expect(notices.body.notices).toEqual([
      expect.objectContaining({ kind: 'audience_widened', read: false, minAge: 20, maxAge: 28, chosenMinAge: 22, chosenMaxAge: 26 }),
    ]);
    await viewer.post('/v1/notices/read', {}).expect(204);
    const after = await viewer.get('/v1/notices').expect(200);
    expect(after.body.unreadCount).toBe(0);
    expect(after.body.notices[0].read).toBe(true);
  });

  it('keeps the chosen range when the widened range is saved again, and resets it when the person picks new ages', async () => {
    await womanAged('TwentySeven', 27);
    const viewer = await liveUser(app, { name: 'Viewer', age: 24, gender: 'man', audience: { genders: ['woman'], minAge: 22, maxAge: 26 } });
    await viewer.get('/v1/explore').expect(200);
    expect((await viewer.get('/v1/me').expect(200)).body.audience).toMatchObject({ minAge: 20, maxAge: 28 });

    await viewer.patch('/v1/me', { audience: { genders: ['woman', 'non_binary'], minAge: 20, maxAge: 28 } }).expect(200);
    expect(await chosenRange(viewer)).toEqual({ minAge: 22, maxAge: 26 });

    await viewer.patch('/v1/me', { audience: { genders: ['woman'], minAge: 21, maxAge: 25 } }).expect(200);
    expect(await chosenRange(viewer)).toEqual({ minAge: 21, maxAge: 25 });
  });

  it('does not widen when widening would bring in nobody, or when enough people are available', async () => {
    await womanAged('Far', 35);
    const lonely = await liveUser(app, { name: 'Lonely', age: 24, gender: 'man', audience: { genders: ['woman'], minAge: 22, maxAge: 26 } });
    await lonely.get('/v1/explore').expect(200);
    expect((await lonely.get('/v1/me').expect(200)).body.audience).toMatchObject({ minAge: 22, maxAge: 26 });
    expect((await lonely.get('/v1/notices').expect(200)).body.notices).toEqual([]);

    for (let i = 0; i < 6; i++) await womanAged(`In${i}`, 24);
    await womanAged('Edge', 27);
    const busy = await liveUser(app, { name: 'Busy', age: 24, gender: 'man', audience: { genders: ['woman'], minAge: 22, maxAge: 26 } });
    await busy.get('/v1/explore').expect(200);
    expect((await busy.get('/v1/me').expect(200)).body.audience).toMatchObject({ minAge: 22, maxAge: 26 });
    expect((await busy.get('/v1/notices').expect(200)).body.unreadCount).toBe(0);
  });

  describe('changing the audience during the day (decided 2026-10-20)', () => {
    const intoWomen = (min: number, max: number) => ({ genders: ['woman' as const], minAge: min, maxAge: max });
    const viewerWith = (min: number, max: number) => liveUser(app, { name: 'Viewer', age: 24, gender: 'man', audience: intoWomen(min, max) });
    async function mandatoryTargets(viewer: Live) {
      return (await slotsOf(viewer)).map((s) => s.targetId);
    }

    it('does nothing before the first visit: the set is built from the new audience when it is first needed', async () => {
      const w30 = await womanAged('Thirty', 30);
      const viewer = await viewerWith(22, 26);
      await viewer.patch('/v1/me', { audience: intoWomen(28, 32) }).expect(200);
      expect(await prisma.dailyProgress.count({ where: { userId: viewer.id } })).toBe(0);
      await viewer.get('/v1/explore').expect(200);
      expect(await mandatoryTargets(viewer)).toEqual([w30.id]);
    });

    it('rebuilds the whole set from the new audience when nothing has been given yet', async () => {
      // Ages far apart, so widening (up to 4 years past the chosen range) never reaches the other woman.
      const w24 = await womanAged('TwentyFour', 24);
      const w36 = await womanAged('ThirtySix', 36);
      const viewer = await viewerWith(22, 26);
      await viewer.get('/v1/explore').expect(200);
      expect(await mandatoryTargets(viewer)).toEqual([w24.id]);

      await viewer.patch('/v1/me', { audience: intoWomen(34, 38) }).expect(200);
      const res = await viewer.get('/v1/explore').expect(200);
      expect(await mandatoryTargets(viewer)).toEqual([w36.id]);
      expect(res.body.card.profile.id).toBe(w36.id);
      expect(res.body.daily.requiredCount).toBe(1);
    });

    it('keeps what was given, widens if needed, and replaces waiting slots that no longer fit', async () => {
      const young = [];
      for (let i = 0; i < 6; i++) young.push(await womanAged(`Young${i}`, 24));
      for (let i = 0; i < 3; i++) await womanAged(`Older${i}`, 30);
      const viewer = await viewerWith(22, 26);
      const start = await viewer.get('/v1/explore').expect(200);
      expect(start.body.daily.requiredCount).toBe(2);
      const firstCard = start.body.card.profile;
      await give(viewer, firstCard.posts[0].id).expect(201);

      await viewer.patch('/v1/me', { audience: intoWomen(28, 32) }).expect(200);
      const me = await viewer.get('/v1/me').expect(200);
      // Only 3 women fit 28 to 32, so the range widened (2 years per end, up to 4): 24 to 36.
      expect(me.body.audience).toMatchObject({ minAge: 24, maxAge: 36 });
      expect((await viewer.get('/v1/notices').expect(200)).body.unreadCount).toBe(1);

      const after = await viewer.get('/v1/explore').expect(200);
      expect(after.body.daily).toMatchObject({ requiredCount: 2, givenCount: 1, unlocked: false });
      const given = (await slotsOf(viewer)).filter((s) => s.status === 'given');
      expect(given.map((s) => s.targetId)).toEqual([firstCard.id]);
    });

    it('replaces a waiting slot that falls outside the new audience', async () => {
      for (let i = 0; i < 6; i++) await womanAged(`Young${i}`, 24);
      const older = [];
      for (let i = 0; i < 9; i++) older.push(await womanAged(`Older${i}`, 30));
      const viewer = await viewerWith(22, 26);
      const start = await viewer.get('/v1/explore').expect(200);
      expect(start.body.daily.requiredCount).toBe(2);
      await give(viewer, start.body.card.profile.posts[0].id).expect(201);
      const waiting = (await slotsOf(viewer)).find((s) => s.status === 'pending')!.targetId;

      // 9 women aged 30 fit 28 to 32, so no widening is needed.
      await viewer.patch('/v1/me', { audience: intoWomen(28, 32) }).expect(200);
      const res = await viewer.get('/v1/explore').expect(200);
      expect(res.body.card.profile.id).not.toBe(waiting);
      expect(older.map((w) => w.id)).toContain(res.body.card.profile.id);
      expect((await viewer.get('/v1/me').expect(200)).body.audience).toMatchObject({ minAge: 28, maxAge: 32 });
      expect((await viewer.get('/v1/notices').expect(200)).body.unreadCount).toBe(0);
    });

    it('does not rebuild a finished set, but profiles after it follow the new audience', async () => {
      const w24 = await womanAged('TwentyFour', 24);
      const w36 = await womanAged('ThirtySix', 36);
      const viewer = await viewerWith(22, 26);
      const start = await viewer.get('/v1/explore').expect(200);
      await give(viewer, start.body.card.profile.posts[0].id).expect(201);
      expect((await viewer.get('/v1/explore').expect(200)).body.daily.unlocked).toBe(true);
      const before = await mandatoryTargets(viewer);
      expect(before).toEqual([w24.id]);

      await viewer.patch('/v1/me', { audience: intoWomen(34, 38) }).expect(200);
      const res = await viewer.get('/v1/explore').expect(200);
      expect(res.body.daily).toMatchObject({ unlocked: true, requiredCount: 1, givenCount: 1 });
      expect(await mandatoryTargets(viewer)).toEqual(before);
      expect(res.body.card.slot).toBe('optional');
      expect(res.body.card.profile.id).toBe(w36.id);
    });
  });
});
