/**
 * Local development seed: verified, live test users with deterministic ids, generated placeholder
 * photos (colour gradients, no real people), one audio post, a few perspectives, a pending connect
 * request, and one connection with messages. Safe to re-run: it deletes and recreates these users.
 *
 * Every seed user's password is `perspective123`.
 */
import { PrismaClient, Gender, Orientation, PostCategory } from '@prisma/client';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/auth/passwords';
import { dayKeyFor } from '../src/common/day';
import { gradientPng, toneWav } from './media-fixtures';

if (existsSync('.env')) process.loadEnvFile('.env');

const prisma = new PrismaClient();
const TZ = process.env.APP_TIMEZONE ?? 'Asia/Kolkata';
const MEDIA_DIR = resolve(process.env.MEDIA_STORAGE_DIR ?? './.data/media');

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

// ---------- seed data ----------
interface SeedPost {
  kind: 'photo' | 'audio';
  prompt: string;
  category: PostCategory;
  focusAreas: string[];
  colors?: [[number, number, number], [number, number, number]];
}
interface SeedUser {
  n: number;
  email: string;
  name: string;
  age: number;
  gender: Gender;
  orientation: Orientation;
  heightCm: number;
  city: string;
  audience: { genders: Gender[]; minAge: number; maxAge: number };
  posts: SeedPost[];
}

const USERS: SeedUser[] = [
  {
    n: 1, email: 'ravi@perspective.test', name: 'Ravi', age: 24, gender: 'man', orientation: 'straight', heightCm: 178, city: 'Bengaluru',
    audience: { genders: ['woman'], minAge: 18, maxAge: 30 },
    posts: [
      { kind: 'photo', prompt: 'Does this outfit work for a first date?', category: 'style', focusAreas: ['outfit', 'fit'], colors: [[94, 75, 219], [247, 196, 160]] },
      { kind: 'photo', prompt: 'Six months of training. Honest take on my progress?', category: 'fitness', focusAreas: ['physique', 'progress'], colors: [[40, 122, 91], [230, 230, 210]] },
      { kind: 'audio', prompt: 'How does my voice come across?', category: 'voice', focusAreas: ['tone', 'confidence'] },
    ],
  },
  {
    n: 2, email: 'meera@perspective.test', name: 'Meera', age: 23, gender: 'woman', orientation: 'straight', heightCm: 165, city: 'Bengaluru',
    audience: { genders: ['man'], minAge: 21, maxAge: 32 },
    posts: [
      { kind: 'photo', prompt: 'First impression from this photo?', category: 'looks', focusAreas: ['first_look', 'expression'], colors: [[184, 107, 32], [250, 225, 190]] },
      { kind: 'photo', prompt: 'Too much for a work dinner?', category: 'style', focusAreas: ['occasion', 'colors'], colors: [[179, 58, 58], [246, 210, 200]] },
    ],
  },
  {
    n: 3, email: 'asha@perspective.test', name: 'Asha', age: 26, gender: 'woman', orientation: 'bisexual', heightCm: 168, city: 'Mumbai',
    audience: { genders: ['man', 'woman'], minAge: 22, maxAge: 35 },
    posts: [
      { kind: 'photo', prompt: 'What vibe do I give off here?', category: 'vibe', focusAreas: ['energy', 'approachable'], colors: [[23, 23, 27], [91, 75, 219]] },
      { kind: 'photo', prompt: 'Is this my best angle?', category: 'looks', focusAreas: ['photo'], colors: [[110, 108, 115], [240, 236, 228]] },
    ],
  },
  {
    n: 4, email: 'kabir@perspective.test', name: 'Kabir', age: 28, gender: 'man', orientation: 'straight', heightCm: 182, city: 'Bengaluru',
    audience: { genders: ['woman'], minAge: 21, maxAge: 35 },
    posts: [
      { kind: 'photo', prompt: 'Does my posture look confident?', category: 'fitness', focusAreas: ['posture'], colors: [[30, 90, 140], [200, 225, 240]] },
    ],
  },
  {
    n: 5, email: 'nisha@perspective.test', name: 'Nisha', age: 22, gender: 'woman', orientation: 'straight', heightCm: 160, city: 'Delhi',
    audience: { genders: ['man'], minAge: 18, maxAge: 28 },
    posts: [
      { kind: 'photo', prompt: 'New haircut. Yay or nay?', category: 'style', focusAreas: ['grooming'], colors: [[200, 120, 160], [250, 235, 240]] },
    ],
  },
  {
    n: 6, email: 'priya@perspective.test', name: 'Priya', age: 25, gender: 'woman', orientation: 'straight', heightCm: 170, city: 'Bengaluru',
    audience: { genders: ['man'], minAge: 21, maxAge: 35 },
    posts: [
      { kind: 'photo', prompt: 'Does this say approachable or intimidating?', category: 'vibe', focusAreas: ['impression', 'approachable'], colors: [[60, 60, 90], [220, 200, 240]] },
    ],
  },
  {
    n: 7, email: 'arjun@perspective.test', name: 'Arjun', age: 30, gender: 'man', orientation: 'gay', heightCm: 175, city: 'Bengaluru',
    audience: { genders: ['man'], minAge: 24, maxAge: 40 },
    posts: [
      { kind: 'photo', prompt: 'Gym or office look — which works better?', category: 'style', focusAreas: ['outfit'], colors: [[20, 110, 110], [220, 240, 235]] },
    ],
  },
];

async function main(): Promise<void> {
  const now = new Date();
  const today = dayKeyFor(now, TZ);
  const yesterday = dayKeyFor(new Date(now.getTime() - 86400000), TZ);
  const passwordHash = await hashPassword('perspective123');
  await mkdir(MEDIA_DIR, { recursive: true });

  const ids = USERS.map((u) => id(u.n));
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  const postIds = new Map<string, string[]>();
  for (const u of USERS) {
    const userId = id(u.n);
    await prisma.user.create({
      data: {
        id: userId,
        email: u.email,
        passwordHash,
        birthDate: new Date(Date.UTC(now.getUTCFullYear() - u.age, 0, 1)),
        termsAcceptedAt: now,
        profile: {
          create: {
            displayName: u.name,
            gender: u.gender,
            heightCm: u.heightCm,
            orientation: u.orientation,
            city: u.city,
            audienceGenders: u.audience.genders,
            audienceMinAge: u.audience.minAge,
            audienceMaxAge: u.audience.maxAge,
            selfieStatus: 'verified',
            selfieCheckedAt: now,
            isLive: true,
          },
        },
      },
    });
    const created: string[] = [];
    for (const [i, p] of u.posts.entries()) {
      const storageKey = randomUUID();
      const data = p.kind === 'photo' ? gradientPng(360, 480, p.colors![0], p.colors![1]) : toneWav(6);
      await writeFile(join(MEDIA_DIR, storageKey), data);
      const media = await prisma.media.create({
        data: {
          ownerId: userId,
          kind: p.kind,
          mimeType: p.kind === 'photo' ? 'image/png' : 'audio/wav',
          storageKey,
          byteSize: data.length,
          durationSec: p.kind === 'audio' ? 6 : null,
        },
      });
      const post = await prisma.post.create({
        data: { ownerId: userId, position: i, kind: p.kind, mediaId: media.id, prompt: p.prompt, category: p.category, focusAreas: p.focusAreas },
      });
      created.push(post.id);
    }
    postIds.set(userId, created);
  }

  const ravi = id(1), meera = id(2), asha = id(3), priya = id(6);
  const giveAt = (dayKey: string) => (dayKey === today ? now : new Date(now.getTime() - 86400000));

  // Yesterday: Meera and Asha gave Ravi perspectives, and Ravi finished yesterday's set (revealed).
  await prisma.dailyProgress.create({ data: { userId: ravi, dayKey: yesterday, requiredCount: 0, unlockedAt: giveAt(yesterday) } });
  await prisma.perspective.create({
    data: {
      postId: postIds.get(ravi)![0], giverId: meera, ownerId: ravi, receivedDayKey: yesterday, createdAt: giveAt(yesterday),
      comment: 'The jacket really works on you, it looks relaxed but intentional. I would swap the shoes for something cleaner.',
      chips: ['Put-together', 'Try a different fit'],
    },
  });
  await prisma.perspective.create({
    data: {
      postId: postIds.get(ravi)![1], giverId: asha, ownerId: ravi, receivedDayKey: yesterday, createdAt: giveAt(yesterday),
      comment: 'Your shoulders and arms show real consistency. Posture looks a little forward, so maybe add some back work.',
      chips: ['Consistency shows', 'Posture could improve'],
    },
  });

  // Today: Priya gave Ravi a perspective and asked to connect (locked until Ravi gives today's set).
  const priyaToRavi = await prisma.perspective.create({
    data: {
      postId: postIds.get(ravi)![2], giverId: priya, ownerId: ravi, receivedDayKey: today,
      comment: 'Your voice is calm and warm, it is easy to listen to. You sound confident without trying too hard.',
      chips: ['Warm', 'Calm'],
    },
  });
  await prisma.connectRequest.create({
    data: { senderId: priya, receiverId: ravi, perspectiveId: priyaToRavi.id, receivedDayKey: today },
  });

  // An existing connection: Ravi gave Asha a perspective and she accepted his request.
  const raviToAsha = await prisma.perspective.create({
    data: {
      postId: postIds.get(asha)![0], giverId: ravi, ownerId: asha, receivedDayKey: yesterday, createdAt: giveAt(yesterday),
      comment: 'You come across as calm and a little mysterious, in a good way. Feels like you would be fun to talk to.',
      chips: ['Calm', 'Approachable'],
    },
  });
  const accepted = await prisma.connectRequest.create({
    data: { senderId: ravi, receiverId: asha, perspectiveId: raviToAsha.id, receivedDayKey: yesterday, status: 'accepted', respondedAt: now },
  });
  const connection = await prisma.connection.create({
    data: {
      userAId: ravi < asha ? ravi : asha,
      userBId: ravi < asha ? asha : ravi,
      originRequestId: accepted.id,
      // Connected two hours ago and both have already seen the connected moment.
      connectedAt: new Date(now.getTime() - 2 * 3600000),
      userASeenAt: now,
      userBSeenAt: now,
    },
  });
  await prisma.message.createMany({
    data: [
      { connectionId: connection.id, senderId: asha, text: 'Thanks for the honest take! Mysterious was not what I expected 😄', createdAt: new Date(now.getTime() - 3600000) },
      { connectionId: connection.id, senderId: ravi, text: 'Ha, in a good way! Are you into photography?', createdAt: new Date(now.getTime() - 3000000) },
    ],
  });

  console.log(`Seeded ${USERS.length} verified users. Password for all: perspective123`);
  for (const u of USERS) console.log(`  ${u.name.padEnd(6)} ${u.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
