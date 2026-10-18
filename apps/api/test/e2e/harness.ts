import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Gender } from '@perspective/contracts';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/prisma/prisma.service';
import { gradientPng } from '../../prisma/media-fixtures';

export const PNG_BASE64 = gradientPng(8, 8, [90, 70, 200], [240, 200, 160]).toString('base64');
export const LONG_COMMENT = 'This comes across as relaxed and confident, the colours work and the fit is right.';

export async function createApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ['error'] });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDb(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

/** Thin client: adds the bearer token and a fresh idempotency key to every mutation. */
export class Client {
  constructor(
    private readonly app: INestApplication,
    public token: string,
    public id: string,
  ) {}

  get(path: string) {
    return request(this.app.getHttpServer()).get(path).set('authorization', `Bearer ${this.token}`);
  }

  post(path: string, body?: object, key: string = randomUUID()) {
    return request(this.app.getHttpServer())
      .post(path)
      .set('authorization', `Bearer ${this.token}`)
      .set('idempotency-key', key)
      .send(body ?? {});
  }

  patch(path: string, body: object) {
    return request(this.app.getHttpServer())
      .patch(path)
      .set('authorization', `Bearer ${this.token}`)
      .set('idempotency-key', randomUUID())
      .send(body);
  }

  delete(path: string) {
    return request(this.app.getHttpServer())
      .delete(path)
      .set('authorization', `Bearer ${this.token}`)
      .set('idempotency-key', randomUUID());
  }
}

export function birthDateForAge(age: number): string {
  return `${new Date().getUTCFullYear() - age}-01-01`;
}

export async function signUp(app: INestApplication, email: string, age = 25): Promise<Client> {
  const res = await request(app.getHttpServer())
    .post('/v1/auth/signup')
    .send({ email, password: 'perspective123', birthDate: birthDateForAge(age), acceptTerms: true })
    .expect(201);
  const me = await request(app.getHttpServer()).get('/v1/me').set('authorization', `Bearer ${res.body.accessToken}`).expect(200);
  return new Client(app, res.body.accessToken, me.body.id);
}

export async function uploadPhoto(c: Client): Promise<string> {
  const res = await c.post('/v1/media', { kind: 'photo', mimeType: 'image/png', dataBase64: PNG_BASE64 }).expect(201);
  return res.body.mediaId;
}

export interface LiveUserOptions {
  name: string;
  gender: Gender;
  age?: number;
  audience: { genders: Gender[]; minAge: number; maxAge: number };
  extraPosts?: number;
}

/** Signs up and completes the profile: basics, audience, selfie, primary photo post. */
export async function liveUser(app: INestApplication, o: LiveUserOptions): Promise<Client & { postIds: string[] }> {
  const c = await signUp(app, `${o.name.toLowerCase()}-${randomUUID().slice(0, 8)}@test.local`, o.age ?? 25);
  await c
    .patch('/v1/me', {
      displayName: o.name,
      gender: o.gender,
      heightCm: 172,
      orientation: 'straight',
      city: 'Bengaluru',
      audience: o.audience,
    })
    .expect(200);
  await c.post('/v1/me/selfie-verification', { mediaId: await uploadPhoto(c) }).expect(200);
  const postIds: string[] = [];
  for (let i = 0; i <= (o.extraPosts ?? 0); i++) {
    const res = await c
      .post('/v1/me/posts', {
        kind: 'photo',
        mediaId: await uploadPhoto(c),
        prompt: `How does photo ${i + 1} come across?`,
        category: 'style',
        focusAreas: ['outfit'],
      })
      .expect(201);
    postIds.push(res.body.id);
  }
  return Object.assign(c, { postIds });
}

export function give(giver: Client, postId: string, extra: object = {}) {
  return giver.post('/v1/perspectives', { postId, comment: LONG_COMMENT, ...extra });
}

/** Makes sure `giver` has given `owner` at least one perspective (the give-back needed to accept). */
export async function ensureGave(giver: Client, owner: { id: string; postIds: string[] }): Promise<void> {
  const view = await giver.get(`/v1/profiles/${owner.id}`).expect(200);
  if (view.body.relationship.gaveToThem) return;
  await give(giver, owner.postIds[0]).expect(201);
}
