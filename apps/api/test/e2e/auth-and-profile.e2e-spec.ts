import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PNG_BASE64, birthDateForAge, createApp, liveUser, resetDb, signUp, uploadPhoto } from './harness';

describe('auth, guards and profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  describe('auth', () => {
    it('rejects anyone under 18 and duplicate emails', async () => {
      await http()
        .post('/v1/auth/signup')
        .send({ email: 'kid@test.local', password: 'perspective123', birthDate: birthDateForAge(17), acceptTerms: true })
        .expect(400);
      await signUp(app, 'dup@test.local');
      const dup = await http()
        .post('/v1/auth/signup')
        .send({ email: 'DUP@test.local', password: 'perspective123', birthDate: birthDateForAge(30), acceptTerms: true })
        .expect(409);
      expect(dup.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('logs in, rejects wrong passwords without revealing which part was wrong', async () => {
      await signUp(app, 'ravi@test.local');
      await http().post('/v1/auth/login').send({ email: 'ravi@test.local', password: 'perspective123' }).expect(200);
      const bad = await http().post('/v1/auth/login').send({ email: 'ravi@test.local', password: 'nope' }).expect(401);
      const unknown = await http().post('/v1/auth/login').send({ email: 'nobody@test.local', password: 'nope' }).expect(401);
      expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.error.message).toBe(bad.body.error.message);
    });

    it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
      const first = await http()
        .post('/v1/auth/signup')
        .send({ email: 'rot@test.local', password: 'perspective123', birthDate: birthDateForAge(30), acceptTerms: true })
        .expect(201);
      const second = await http().post('/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(200);
      // Reusing the first token is treated as theft: the whole family is revoked.
      await http().post('/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
      await http().post('/v1/auth/refresh').send({ refreshToken: second.body.refreshToken }).expect(401);
    });

    it('denies by default without a token and denies suspended accounts', async () => {
      const none = await http().get('/v1/me').expect(401);
      expect(none.body.error.code).toBe('UNAUTHORIZED');
      const c = await signUp(app, 'sus@test.local');
      await prisma.user.update({ where: { id: c.id }, data: { status: 'suspended' } });
      const res = await c.get('/v1/me').expect(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('requires an idempotency key on mutations and replays retries', async () => {
      const c = await signUp(app, 'idem@test.local');
      await http()
        .patch('/v1/me')
        .set('authorization', `Bearer ${c.token}`)
        .send({ displayName: 'X' })
        .expect(400)
        .expect((r) => expect(r.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED'));
      const key = randomUUID();
      const body = { kind: 'photo', mimeType: 'image/png', dataBase64: PNG_BASE64 };
      const a = await c.post('/v1/media', body, key).expect(201);
      const b = await c.post('/v1/media', body, key).expect(201);
      expect(b.body.mediaId).toBe(a.body.mediaId);
      expect(await prisma.media.count({ where: { ownerId: c.id } })).toBe(1);
    });
  });

  describe('profile', () => {
    it('stays offline until basics, audience, selfie and a primary photo post exist', async () => {
      const c = await signUp(app, 'new@test.local');
      const me = await c.get('/v1/me').expect(200);
      expect(me.body.isLive).toBe(false);
      expect(me.body.missing).toEqual(['basics', 'audience', 'selfie', 'primary_photo_post']);
      const explore = await c.get('/v1/explore').expect(403);
      expect(explore.body.error.code).toBe('SELFIE_VERIFICATION_REQUIRED');

      const live = await liveUser(app, { name: 'Ravi', gender: 'man', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
      const liveMe = await live.get('/v1/me').expect(200);
      expect(liveMe.body.isLive).toBe(true);
      expect(liveMe.body.missing).toEqual([]);
    });

    it('requires the first post to be a photo and allows at most six posts', async () => {
      const c = await signUp(app, 'posts@test.local');
      const audio = await c
        .post('/v1/media', { kind: 'audio', mimeType: 'audio/wav', dataBase64: 'UklGRiQAAABXQVZF', durationSec: 5 })
        .expect(201);
      const first = await c
        .post('/v1/me/posts', { kind: 'audio', mediaId: audio.body.mediaId, prompt: 'How do I sound?', category: 'voice', focusAreas: ['tone'] })
        .expect(422);
      expect(first.body.error.code).toBe('PRIMARY_POST_REQUIRED');

      for (let i = 0; i < 6; i++) {
        await c
          .post('/v1/me/posts', { kind: 'photo', mediaId: await uploadPhoto(c), prompt: `Prompt number ${i}`, category: 'looks', focusAreas: ['photo'] })
          .expect(201);
      }
      const seventh = await c
        .post('/v1/me/posts', { kind: 'photo', mediaId: await uploadPhoto(c), prompt: 'One too many', category: 'looks', focusAreas: ['photo'] })
        .expect(422);
      expect(seventh.body.error.code).toBe('POST_LIMIT_REACHED');
    });

    it('rejects audio longer than 15 seconds', async () => {
      const c = await signUp(app, 'long@test.local');
      await c.post('/v1/media', { kind: 'audio', mimeType: 'audio/wav', dataBase64: 'UklGRiQAAABXQVZF', durationSec: 16 }).expect(400);
    });

    it('never exposes private fields or the selfie to other users', async () => {
      const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
      const meera = await liveUser(app, { name: 'Meera', gender: 'woman', audience: { genders: ['man'], minAge: 18, maxAge: 30 } });
      const view = await meera.get(`/v1/profiles/${ravi.id}`).expect(200);
      const json = JSON.stringify(view.body);
      expect(json).not.toMatch(/email|birthDate|selfie|audience/i);
      const selfie = await prisma.profile.findUniqueOrThrow({ where: { userId: ravi.id } });
      expect(json).not.toContain(selfie.selfieMediaId!);
      // A signed URL for the selfie cannot be forged without the secret.
      await http().get(`/v1/media/${selfie.selfieMediaId}/content?exp=9999999999&sig=forged`).expect(404);
      const postUrl: string = view.body.profile.posts[0].mediaUrl;
      await http().get(postUrl).expect(200).expect('content-type', /image\/png/);
    });

    it('hides profiles outside each other’s audience', async () => {
      const ravi = await liveUser(app, { name: 'Ravi', gender: 'man', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
      const nisha = await liveUser(app, { name: 'Nisha', gender: 'woman', audience: { genders: ['woman'], minAge: 18, maxAge: 30 } });
      const res = await ravi.get(`/v1/profiles/${nisha.id}`).expect(403);
      expect(res.body.error.code).toBe('PROFILE_NOT_ELIGIBLE');
    });

    it('reorders posts and enforces that position 0 must be a photo', async () => {
      const c = await signUp(app, 'reorder@test.local');
      const photo1 = await c
        .post('/v1/me/posts', { kind: 'photo', mediaId: await uploadPhoto(c), prompt: 'First photo', category: 'looks', focusAreas: ['photo'] })
        .expect(201);
      const photo2 = await c
        .post('/v1/me/posts', { kind: 'photo', mediaId: await uploadPhoto(c), prompt: 'Second photo', category: 'looks', focusAreas: ['photo'] })
        .expect(201);
      const audioMedia = await c
        .post('/v1/media', { kind: 'audio', mimeType: 'audio/wav', dataBase64: 'UklGRiQAAABXQVZF', durationSec: 10 })
        .expect(201);
      const audioPost = await c
        .post('/v1/me/posts', { kind: 'audio', mediaId: audioMedia.body.mediaId, prompt: 'How do I sound?', category: 'voice', focusAreas: ['tone'] })
        .expect(201);

      // Putting audio at position 0 should fail
      const bad = await c
        .patch('/v1/me/posts/reorder', { postIds: [audioPost.body.id, photo1.body.id, photo2.body.id] })
        .expect(422);
      expect(bad.body.error.code).toBe('PRIMARY_POST_REQUIRED');

      // Reordering [photo2, audioPost, photo1] should succeed
      const reordered = await c
        .patch('/v1/me/posts/reorder', { postIds: [photo2.body.id, audioPost.body.id, photo1.body.id] })
        .expect(200);
      expect(reordered.body.map((p: any) => p.id)).toEqual([photo2.body.id, audioPost.body.id, photo1.body.id]);
      expect(reordered.body[0].position).toBe(0);
      expect(reordered.body[1].position).toBe(1);
      expect(reordered.body[2].position).toBe(2);
    });
  });
});

