import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createApp, give, liveUser, resetDb } from './harness';

/** Beta step 4 (decided 2026-10-20): You → Blocked people, with unblock. */
describe('blocked people list (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const intoMen = { genders: ['man' as const], minAge: 18, maxAge: 40 };
  const intoWomen = { genders: ['woman' as const], minAge: 18, maxAge: 40 };

  it('lists the people you blocked, newest first, only to you, and unblocks them', async () => {
    const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: intoWomen });
    const meera = await liveUser(app, { name: 'Meera', gender: 'woman', audience: intoMen });
    const asha = await liveUser(app, { name: 'Asha', gender: 'woman', audience: intoMen });
    expect((await ravi.get('/v1/blocks').expect(200)).body).toEqual([]);

    // Meera had asked Ravi to connect; blocking cancels that.
    await give(meera, ravi.postIds[0], { connect: true }).expect(201);
    await ravi.post(`/v1/blocks/${meera.id}`).expect(204);
    await new Promise((r) => setTimeout(r, 5));
    await ravi.post(`/v1/blocks/${asha.id}`).expect(204);

    const list = await ravi.get('/v1/blocks').expect(200);
    expect(list.body.map((b: { person: { id: string } }) => b.person.id)).toEqual([asha.id, meera.id]);
    expect(list.body[0].person).toMatchObject({ displayName: 'Asha', verified: true });
    expect(JSON.stringify(list.body)).not.toMatch(/email|birthDate|audience|orientation/i);
    // The people who were blocked don't see a list of who blocked them.
    expect((await meera.get('/v1/blocks').expect(200)).body).toEqual([]);
    await ravi.get(`/v1/profiles/${meera.id}`).expect(404);

    await ravi.delete(`/v1/blocks/${meera.id}`).expect(204);
    expect((await ravi.get('/v1/blocks').expect(200)).body.map((b: { person: { id: string } }) => b.person.id)).toEqual([asha.id]);
    // Unblocked: they can see each other again; the cancelled request does not come back.
    await ravi.get(`/v1/profiles/${meera.id}`).expect(200);
    const requests = await prisma.connectRequest.findMany({ where: { senderId: meera.id, receiverId: ravi.id } });
    expect(requests.map((r) => r.status)).toEqual(['cancelled']);
  });
});
