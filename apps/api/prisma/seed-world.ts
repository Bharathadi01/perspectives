/**
 * The test world: about 100 fake, verified people set up so that every beta rule and the ranking
 * formula can be seen in the app (guide: business-logic/TEST_WORLD.md). Local development only.
 * Safe to re-run: it deletes and recreates everyone with an @world.test email. Password for all:
 * perspective123. Photos are generated colour gradients, not real people.
 *
 *   pnpm db:seed:world
 */
import { Gender, PostCategory, PrismaClient, ProfileGoal } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { generateTotpSecret } from '../src/admin/totp';
import { hashPassword } from '../src/auth/passwords';
import { dayKeyFor } from '../src/common/day';
import { gradientPng, toneWav } from './media-fixtures';

if (existsSync('.env')) process.loadEnvFile('.env');

const prisma = new PrismaClient();
const TZ = process.env.APP_TIMEZONE ?? 'Asia/Kolkata';
const MEDIA_DIR = resolve(process.env.MEDIA_STORAGE_DIR ?? './.data/media');
const DOMAIN = '@world.test';
const DAY = 86400000;

// ---------- deterministic randomness (same world every run) ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261021);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const pickMany = <T>(xs: readonly T[], n: number): T[] => {
  const copy = [...xs];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

// ---------- building blocks ----------
const INTERESTS = [
  'art_design', 'photography', 'writing_poetry', 'architecture', 'crafting_diy', 'live_gigs', 'indie_alt', 'electronic_techno',
  'hip_hop_rnb', 'jazz_soul', 'classical', 'hiking_trails', 'running', 'yoga_pilates', 'gym_lifting', 'cycling',
  'bouldering_climbing', 'surfing_ocean', 'specialty_coffee', 'home_cooking', 'natural_wine', 'street_food', 'baking',
  'craft_cocktails', 'cinema_film', 'video_games', 'standup_comedy', 'anime_manga', 'board_games', 'theatre_stage',
  'startups_tech', 'philosophy', 'podcasts', 'science_nature', 'books_reading', 'psychology', 'travel_backpacking',
  'mindfulness', 'vintage_thrifting', 'road_trips', 'plant_parent', 'music_festivals', 'volunteering',
  'climate_sustainability', 'animal_welfare',
] as const;
/** Isha's interests; three men share all of them, so they rank at the top of her Explore. */
const ISHA_INTERESTS = ['photography', 'hiking_trails', 'specialty_coffee', 'books_reading', 'indie_alt'];
const OTHER_INTERESTS = INTERESTS.filter((i) => !ISHA_INTERESTS.includes(i));

interface PromptDef {
  prompt: string;
  category: PostCategory;
  focusAreas: string[];
  audio?: boolean;
}
const PRIMARY_PROMPTS: PromptDef[] = [
  { prompt: 'Does this outfit work for a first date?', category: 'style', focusAreas: ['outfit', 'fit'] },
  { prompt: 'What is your honest first impression of me?', category: 'looks', focusAreas: ['first_look', 'expression'] },
  { prompt: 'Approachable or intimidating? Be honest.', category: 'vibe', focusAreas: ['approachable', 'impression'] },
  { prompt: 'Is this my best angle, or should I retire this photo?', category: 'looks', focusAreas: ['photo'] },
  { prompt: 'Too much colour, or just right?', category: 'style', focusAreas: ['colors'] },
  { prompt: 'New haircut. Does it suit my face?', category: 'grooming', focusAreas: ['haircut'] },
  { prompt: 'Beard or no beard? Which version of me works?', category: 'grooming', focusAreas: ['facial_hair', 'overall_grooming'] },
  { prompt: 'What energy do I give off here?', category: 'vibe', focusAreas: ['energy', 'standout'] },
  { prompt: 'Would you trust me with your dog after this photo?', category: 'personality', focusAreas: ['kindness', 'genuine'] },
  { prompt: 'Does this look effortless or like I tried too hard?', category: 'style', focusAreas: ['outfit', 'accessories'] },
  { prompt: 'Eight months of training. Honest take on the progress?', category: 'fitness', focusAreas: ['physique', 'progress'] },
  { prompt: 'Does my posture say confident or tired?', category: 'fitness', focusAreas: ['posture'] },
  { prompt: 'Right outfit for a friend’s wedding?', category: 'style', focusAreas: ['occasion', 'outfit'] },
  { prompt: 'What does this photo say about me?', category: 'profile', focusAreas: ['genuine', 'standout'] },
  { prompt: 'Do I look as relaxed as I felt here?', category: 'looks', focusAreas: ['expression', 'photo'] },
];
const EXTRA_PROMPTS: PromptDef[] = [
  { prompt: 'How does my voice come across on a first call?', category: 'voice', focusAreas: ['tone', 'warmth'], audio: true },
  { prompt: 'Do I sound confident or nervous here?', category: 'voice', focusAreas: ['confidence', 'clarity'], audio: true },
  { prompt: 'My weekend in one photo. What would you ask me?', category: 'lifestyle', focusAreas: ['curious', 'looks_fun'] },
  { prompt: 'What does my bookshelf say about me?', category: 'interests', focusAreas: ['comes_across', 'want_to_know'] },
  { prompt: 'I made this from scratch. Does it look like I can cook?', category: 'interests', focusAreas: ['shown_well'] },
  { prompt: 'Am I funny or just loud? Judge this caption.', category: 'personality', focusAreas: ['humor'] },
  { prompt: 'Is my bio photo too serious?', category: 'profile', focusAreas: ['missing', 'curious'] },
  { prompt: 'Trail view from last Sunday. Does it say adventurous?', category: 'lifestyle', focusAreas: ['says_about', 'setting'] },
  { prompt: 'Gym form check: anything I should fix?', category: 'fitness', focusAreas: ['training'] },
  { prompt: 'Does this jacket fit me or wear me?', category: 'style', focusAreas: ['fit'] },
  { prompt: 'Grooming routine paid off? Be blunt.', category: 'grooming', focusAreas: ['freshness', 'overall_grooming'] },
  { prompt: 'One thing you would change here?', category: 'other', focusAreas: ['take', 'change'] },
  { prompt: 'Easy-going or serious? What gives it away?', category: 'personality', focusAreas: ['easygoing', 'confidence'] },
  { prompt: 'Is this hobby interesting or niche-boring?', category: 'interests', focusAreas: ['in_common', 'comes_across'] },
];
const PERSONALITY = [
  { promptId: 'ideal_sunday', question: 'My ideal Sunday looks like...', answers: ['A long run, a longer breakfast, and zero plans after noon.', 'Board games with friends and too much chai.', 'Farmer’s market, a new recipe, and an early night.'] },
  { promptId: 'feel_most_myself', question: 'I feel most like myself when...', answers: ['I am outdoors with nothing to check.', 'Someone asks me about the book I am reading.', 'The music is loud and the kitchen is messy.'] },
  { promptId: 'hyperfixation', question: 'A conversation I can never get tired of is...', answers: ['Why some films age well and others don’t.', 'Startups that should not have worked but did.', 'The best street food in every city I have lived in.'] },
];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'];
const PRONOUNS = [null, null, null, 'she/her', 'he/him', 'they/them'];
const COLORS: [number, number, number][] = [
  [94, 75, 219], [247, 196, 160], [40, 122, 91], [230, 230, 210], [184, 107, 32], [250, 225, 190], [179, 58, 58], [246, 210, 200],
  [23, 23, 27], [110, 108, 115], [30, 90, 140], [200, 225, 240], [200, 120, 160], [60, 60, 90], [220, 200, 240], [20, 110, 110],
];

const WOMEN_NAMES = [
  'Aarohi', 'Bhavna', 'Charu', 'Diya', 'Esha', 'Farah', 'Gauri', 'Hina', 'Ira', 'Jiya', 'Kavya', 'Lavanya', 'Mira', 'Naina',
  'Ojasvi', 'Pari', 'Riya', 'Sana', 'Tanvi', 'Urvi', 'Vani', 'Yamini', 'Zara', 'Anika', 'Bela', 'Chitra', 'Devika', 'Elina',
];
const MEN_NAMES = [
  'Aarav', 'Bharat', 'Chirag', 'Darsh', 'Eshan', 'Farhan', 'Gautam', 'Harsh', 'Ishaan', 'Jai', 'Karan', 'Laksh', 'Manav',
  'Nikhil', 'Om', 'Pranav', 'Rahul', 'Sahil', 'Tanmay', 'Uday', 'Varun', 'Yuvraj', 'Zubin', 'Abhay', 'Budh', 'Chetan',
  'Dhruv', 'Ekansh', 'Faiz', 'Girish', 'Hriday', 'Imran', 'Jatin', 'Kunal', 'Lohit', 'Mihir', 'Neel', 'Ojas', 'Parth', 'Ritesh',
  'Samar', 'Tejas', 'Utkarsh',
];
const NB_NAMES = ['Ari', 'Sky', 'Noor', 'Rumi'];

interface Person {
  key: string;
  name: string;
  age: number;
  gender: Gender;
  audience: { genders: Gender[]; min: number; max: number };
  goals: ProfileGoal[];
  interests: string[];
  /** Days since the profile was made. */
  createdDaysAgo: number;
  /** Days since they last opened the app (null = never). Never 0, so everyone gets a fresh day. */
  lastActiveDaysAgo: number | null;
  posts: number;
  orientation?: 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'queer' | 'prefer_not_to_say' | null;
}

const MEN_INTO_WOMEN = (min = 20, max = 28) => ({ genders: ['woman' as Gender], min, max });
const WOMEN_INTO_MEN = (min = 20, max = 30) => ({ genders: ['man' as Gender], min, max });
const EVERYONE = (min = 18, max = 35) => ({ genders: ['woman', 'man', 'non_binary'] as Gender[], min, max });
const BOTH: ProfileGoal[] = ['get_perspectives', 'meet_people'];
const MEET: ProfileGoal[] = ['meet_people'];
const PERSP: ProfileGoal[] = ['get_perspectives'];
const randomInterests = () => pickMany(OTHER_INTERESTS, between(3, 6));

// ---------- the featured people (each shows one rule; see TEST_WORLD.md) ----------
const FEATURED: Person[] = [
  { key: 'tara', name: 'Tara', age: 23, gender: 'woman', audience: WOMEN_INTO_MEN(20, 30), goals: MEET, interests: ['cinema_film', 'travel_backpacking', 'street_food', 'podcasts'], createdDaysAgo: 40, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'rohan', name: 'Rohan', age: 27, gender: 'man', audience: MEN_INTO_WOMEN(25, 26), goals: MEET, interests: ['startups_tech', 'running', 'specialty_coffee'], createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'neha', name: 'Neha', age: 22, gender: 'woman', audience: { genders: ['non_binary'], min: 18, max: 30 }, goals: PERSP, interests: ['art_design', 'theatre_stage', 'vintage_thrifting'], createdDaysAgo: 25, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'dev', name: 'Dev', age: 24, gender: 'man', audience: MEN_INTO_WOMEN(24, 24), goals: BOTH, interests: ['gym_lifting', 'video_games', 'street_food'], createdDaysAgo: 35, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'sid', name: 'Sid', age: 22, gender: 'man', audience: MEN_INTO_WOMEN(21, 23), goals: MEET, interests: ['standup_comedy', 'hip_hop_rnb', 'board_games'], createdDaysAgo: 28, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'aman', name: 'Aman', age: 26, gender: 'man', audience: MEN_INTO_WOMEN(26, 27), goals: MEET, interests: ['philosophy', 'jazz_soul', 'home_cooking'], createdDaysAgo: 50, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'isha', name: 'Isha', age: 21, gender: 'woman', audience: WOMEN_INTO_MEN(20, 28), goals: BOTH, interests: ISHA_INTERESTS, createdDaysAgo: 20, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'kiran', name: 'Kiran', age: 23, gender: 'man', audience: MEN_INTO_WOMEN(20, 27), goals: MEET, interests: ['road_trips', 'electronic_techno', 'gym_lifting'], createdDaysAgo: 45, lastActiveDaysAgo: 1, posts: 1 },
  { key: 'raj', name: 'Raj', age: 24, gender: 'man', audience: MEN_INTO_WOMEN(20, 27), goals: MEET, interests: ['board_games', 'anime_manga'], createdDaysAgo: 55, lastActiveDaysAgo: 1, posts: 1 },
  { key: 'vikram', name: 'Vikram', age: 25, gender: 'man', audience: MEN_INTO_WOMEN(20, 28), goals: MEET, interests: ['cycling', 'craft_cocktails'], createdDaysAgo: 60, lastActiveDaysAgo: 1, posts: 2 },
  // Special women inside Sid's and Kiran's ranges.
  { key: 'ananya', name: 'Ananya', age: 22, gender: 'woman', audience: WOMEN_INTO_MEN(20, 30), goals: BOTH, interests: ['music_festivals', 'yoga_pilates', 'baking'], createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 3 },
  { key: 'meghna', name: 'Meghna', age: 22, gender: 'woman', audience: WOMEN_INTO_MEN(20, 30), goals: MEET, interests: ['cinema_film', 'natural_wine'], createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'pooja', name: 'Pooja', age: 23, gender: 'woman', audience: WOMEN_INTO_MEN(20, 30), goals: MEET, interests: ['live_gigs', 'street_food'], createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'rhea', name: 'Rhea', age: 21, gender: 'woman', audience: WOMEN_INTO_MEN(20, 30), goals: BOTH, interests: ['surfing_ocean', 'travel_backpacking'], createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  // Isha's interest twins.
  { key: 'arnav', name: 'Arnav', age: 23, gender: 'man', audience: MEN_INTO_WOMEN(20, 26), goals: BOTH, interests: ISHA_INTERESTS, createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'yash', name: 'Yash', age: 24, gender: 'man', audience: MEN_INTO_WOMEN(19, 27), goals: MEET, interests: ISHA_INTERESTS, createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
  { key: 'vihaan', name: 'Vihaan', age: 22, gender: 'man', audience: MEN_INTO_WOMEN(20, 25), goals: BOTH, interests: ISHA_INTERESTS, createdDaysAgo: 30, lastActiveDaysAgo: 1, posts: 2 },
];

// ---------- fillers ----------
/** Women by age (with the special women above): 24 has only 2 women, so Dev's range widens. */
const WOMEN_AGES = [20, 20, 20, 21, 21, 21, 22, 22, 22, 22, 23, 23, 23, 23, 23, 24, 24, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 20, 21, 23];
/** Of those, these indexes are brand-new (1 to 2 days old) and these never come back (inactive 10 days). */
const NEW_WOMEN = new Set([7, 13, 19]); // ages 22, 23, 25
const INACTIVE_WOMEN = new Set([4, 9, 12, 21, 25]); // ages 21, 22, 23, 25, 26
const SEMI_ACTIVE_WOMEN = new Set([1, 16, 28]); // last opened 5 days ago

const MEN_AGES = [20, 20, 20, 21, 21, 21, 21, 22, 22, 22, 22, 22, 23, 23, 23, 23, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 26, 26, 26, 26, 27, 27, 27, 27, 28, 28, 28, 29, 29, 30, 30, 21, 23, 25];
const NEW_MEN = new Set([2, 15, 28]);
const INACTIVE_MEN = new Set([5, 11, 20, 33, 38]);
const GAY_MEN = new Set([9, 24, 35]);

function buildWorld(): Person[] {
  const people: Person[] = [...FEATURED];
  WOMEN_AGES.forEach((age, i) => {
    const perspectivesOnly = i % 9 === 0;
    people.push({
      key: `w${i}`,
      name: WOMEN_NAMES[i % WOMEN_NAMES.length] + (i >= WOMEN_NAMES.length ? ' B' : ''),
      age,
      gender: 'woman',
      audience: perspectivesOnly ? EVERYONE(18, 35) : WOMEN_INTO_MEN(Math.max(18, age - between(2, 4)), age + between(3, 7)),
      goals: perspectivesOnly ? PERSP : pick([MEET, BOTH, BOTH]),
      interests: randomInterests(),
      createdDaysAgo: NEW_WOMEN.has(i) ? between(1, 2) : between(14, 90),
      lastActiveDaysAgo: INACTIVE_WOMEN.has(i) ? 10 : SEMI_ACTIVE_WOMEN.has(i) ? 5 : between(1, 2),
      // Women 25 and older have 3 posts, so Aman can come back to the ones he already answered.
      posts: age >= 25 ? 3 : between(2, 3),
      orientation: perspectivesOnly ? 'bisexual' : pick(['straight', 'straight', 'straight', null]),
    });
  });
  MEN_AGES.forEach((age, i) => {
    const gay = GAY_MEN.has(i);
    people.push({
      key: `m${i}`,
      name: MEN_NAMES[i % MEN_NAMES.length],
      age,
      gender: 'man',
      audience: gay ? { genders: ['man'], min: 20, max: 32 } : MEN_INTO_WOMEN(Math.max(18, age - between(3, 6)), age + between(1, 4)),
      goals: pick([MEET, MEET, BOTH, PERSP]),
      interests: randomInterests(),
      createdDaysAgo: NEW_MEN.has(i) ? between(1, 2) : between(14, 90),
      lastActiveDaysAgo: INACTIVE_MEN.has(i) ? 10 : between(1, 3),
      posts: between(1, 3),
      orientation: gay ? 'gay' : pick(['straight', 'straight', null]),
    });
  });
  NB_NAMES.forEach((name, i) => {
    people.push({
      key: `nb${i}`,
      name,
      age: [21, 23, 24, 26][i],
      gender: 'non_binary',
      audience: EVERYONE(18, 32),
      goals: PERSP,
      interests: randomInterests(),
      createdDaysAgo: between(14, 60),
      lastActiveDaysAgo: 1,
      posts: 2,
      orientation: 'queer',
    });
  });
  return people;
}

// ---------- seeding ----------
async function main(): Promise<void> {
  const now = new Date();
  const dayKey = (daysAgo: number) => dayKeyFor(new Date(now.getTime() - daysAgo * DAY), TZ);
  const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * 3600000);
  const passwordHash = await hashPassword('perspective123');
  await mkdir(MEDIA_DIR, { recursive: true });

  const removed = await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  const world = buildWorld();
  const idOf = new Map<string, string>();
  const postsOf = new Map<string, string[]>();
  const usedEmails = new Set<string>();

  for (const p of world) {
    let email = `${p.name.toLowerCase().replace(/[^a-z]/g, '')}${DOMAIN}`;
    for (let n = 2; usedEmails.has(email); n++) email = `${p.name.toLowerCase().replace(/[^a-z]/g, '')}${n}${DOMAIN}`;
    usedEmails.add(email);
    const created = ago(p.createdDaysAgo);
    const personality = rand() < 0.6 ? pick(PERSONALITY) : null;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        birthDate: new Date(Date.UTC(now.getUTCFullYear() - p.age, 0, 1)),
        termsAcceptedAt: created,
        createdAt: created,
        profile: {
          create: {
            displayName: p.name,
            gender: p.gender,
            heightCm: p.gender === 'man' ? between(165, 190) : between(152, 176),
            orientation: p.orientation ?? null,
            city: pick(CITIES),
            pronouns: pick(PRONOUNS),
            goals: p.goals,
            audienceGenders: p.audience.genders,
            audienceMinAge: p.audience.min,
            audienceMaxAge: p.audience.max,
            audienceChosenMinAge: p.audience.min,
            audienceChosenMaxAge: p.audience.max,
            interests: p.interests,
            lifestylePace: rand() < 0.5 ? pick(['early_bird', 'night_owl', 'balanced', 'active_adventurer', 'laid_back'] as const) : null,
            socialPreference: rand() < 0.5 ? pick(['introvert', 'extrovert', 'ambivert', 'small_groups', 'social_butterfly'] as const) : null,
            personalityPrompts: personality ? [{ promptId: personality.promptId, question: personality.question, answer: pick(personality.answers) }] : [],
            selfieStatus: 'verified',
            selfieCheckedAt: created,
            isLive: true,
            createdAt: created,
          },
        },
      },
    });
    idOf.set(p.key, user.id);

    const prompts = [pick(PRIMARY_PROMPTS), ...pickMany(EXTRA_PROMPTS, p.posts - 1)];
    const postIds: string[] = [];
    for (const [i, def] of prompts.entries()) {
      const audio = i > 0 && !!def.audio;
      const storageKey = randomUUID();
      const data = audio ? toneWav(5) : gradientPng(360, 480, pick(COLORS), pick(COLORS));
      await writeFile(join(MEDIA_DIR, storageKey), data);
      const media = await prisma.media.create({
        data: { ownerId: user.id, kind: audio ? 'audio' : 'photo', mimeType: audio ? 'audio/wav' : 'image/png', storageKey, byteSize: data.length, durationSec: audio ? 5 : null },
      });
      const post = await prisma.post.create({
        data: { ownerId: user.id, position: i, kind: audio ? 'audio' : 'photo', mediaId: media.id, prompt: def.prompt, category: def.category, focusAreas: def.focusAreas, createdAt: created },
      });
      postIds.push(post.id);
    }
    postsOf.set(p.key, postIds);

    // "Opened the app" on that day (Explore or Inbox), so activity rules apply.
    if (p.lastActiveDaysAgo !== null) {
      await prisma.dailyProgress.create({
        data: { userId: user.id, dayKey: dayKey(p.lastActiveDaysAgo), requiredCount: 0, unlockedAt: ago(p.lastActiveDaysAgo) },
      });
    }
  }

  const id = (key: string) => idOf.get(key)!;
  const men = world.filter((p) => p.gender === 'man' && p.key.startsWith('m')).map((p) => p.key);
  const women = world.filter((p) => p.gender === 'woman' && p.key.startsWith('w')).map((p) => p.key);
  const used = new Set<string>(); // giver|post pairs, one perspective per giver per post
  const giveP = async (giver: string, owner: string, postIndex: number, at: Date, extra: { verdict?: 'helpful' | 'not_helpful'; reason?: 'vague' | 'irrelevant' | 'spam' } = {}) => {
    const postId = postsOf.get(owner)![postIndex];
    if (!postId || used.has(`${giver}|${postId}`)) return;
    used.add(`${giver}|${postId}`);
    await prisma.perspective.create({
      data: {
        postId,
        giverId: id(giver),
        ownerId: id(owner),
        comment: pick([
          'The colours really suit you and the fit looks intentional. I would try a slightly darker shoe to finish it.',
          'You come across warm and easy to talk to. The smile feels real, which matters more than the angle.',
          'Honestly the photo is a bit dark, so it is hard to see your face. A daylight shot would help a lot here.',
          'Confident posture and a clear vibe. The background is busy though, so a plainer one would keep focus on you.',
        ]),
        chips: [],
        status: extra.verdict === 'helpful' ? 'helpful' : extra.verdict === 'not_helpful' ? 'archived' : 'delivered',
        verdict: extra.verdict ?? null,
        notHelpfulReason: extra.reason ?? null,
        feedbackAt: extra.verdict ? at : null,
        receivedDayKey: dayKeyFor(at, TZ),
        createdAt: at,
      },
    });
  };

  // Need varies: about a third of the fillers received a perspective in the last 2 days.
  for (const owner of [...women, ...men].filter(() => rand() < 0.33)) {
    const pool = world.find((p) => p.key === owner)!.gender === 'woman' ? men : women;
    await giveP(pick(pool), owner, 0, ago(between(1, 2), between(1, 10)));
  }

  // Ananya received 10 perspectives today: the soft limit keeps her out of daily sets for the rest of the day.
  for (const giver of men.slice(0, 10)) await giveP(giver, 'ananya', between(0, 2), ago(0, 1));

  // Aman gave 4 days ago to 7 of the women aged 26 to 27 (each has 3 posts), so fewer than 6 fresh are left.
  const amanRange = world.filter((p) => p.key.startsWith('w') && p.age >= 26 && p.age <= 27 && !INACTIVE_WOMEN.has(Number(p.key.slice(1))));
  for (const w of amanRange.slice(0, 7)) await giveP('aman', w.key, 0, ago(4));

  // Kiran is a weak giver: 12 "vague" marks from 6 people and 3 helpful (80% low-effort), all before his tip.
  const kiranOwners = women.filter((w) => (postsOf.get(w)?.length ?? 0) >= 2).slice(0, 6);
  for (const [i, w] of kiranOwners.entries()) {
    await giveP('kiran', w, 0, ago(20 - i), { verdict: 'not_helpful', reason: 'vague' });
    await giveP('kiran', w, 1, ago(19 - i), { verdict: 'not_helpful', reason: i % 2 ? 'irrelevant' : 'vague' });
  }
  for (const w of women.slice(10, 13)) await giveP('kiran', w, 0, ago(10), { verdict: 'helpful' });
  await prisma.giverQuality.create({ data: { userId: id('kiran'), weak: true, weakSince: ago(4), lowEffortMarks: 12, helpfulMarks: 3 } });
  await prisma.notice.create({ data: { userId: id('kiran'), kind: 'weak_giver_tip', dedupeKey: `weak_giver_tip:${ago(4).toISOString()}`, data: {}, createdAt: ago(4) } });

  // Raj is a weak giver who kept going after the tip: on the admin's list.
  const rajOwners = women.filter((w) => (postsOf.get(w)?.length ?? 0) >= 3).slice(0, 8);
  let rajMarks = 0;
  for (const [i, w] of rajOwners.entries()) {
    for (let post = 0; post < 3; post++) {
      const before = rajMarks < 10;
      await giveP('raj', w, post, before ? ago(30 - i) : ago(8 - (i % 6)), { verdict: 'not_helpful', reason: post === 2 ? 'spam' : 'vague' });
      rajMarks++;
    }
  }
  await giveP('raj', women[20], 0, ago(15), { verdict: 'helpful' });
  await prisma.giverQuality.create({ data: { userId: id('raj'), weak: true, weakSince: ago(12), flaggedAt: ago(2), lowEffortMarks: rajMarks, helpfulMarks: 1 } });
  await prisma.notice.create({ data: { userId: id('raj'), kind: 'weak_giver_tip', dedupeKey: `weak_giver_tip:${ago(12).toISOString()}`, data: {}, createdAt: ago(12) } });
  await prisma.reviewCase.create({ data: { userId: id('raj'), reason: 'weak_giver', hides: false, openedAt: ago(2) } });

  // Reports: Meghna by 2 people (out of daily sets), Pooja by 3 (on hold), Rhea once seriously (on hold, top of the list).
  const report = (reporter: string, subject: string, reason: 'harassment_hate' | 'spam' | 'nudity_sexual' | 'scam_impersonation', daysAgo: number) =>
    prisma.report.create({
      data: { reporterId: id(reporter), targetType: 'profile', targetId: id(subject), subjectId: id(subject), reason, createdAt: ago(daysAgo) },
    });
  await report(men[12], 'meghna', 'harassment_hate', 3);
  await report(men[13], 'meghna', 'spam', 2);
  await report(men[14], 'pooja', 'harassment_hate', 5);
  await report(men[16], 'pooja', 'harassment_hate', 4);
  await report(men[17], 'pooja', 'scam_impersonation', 3);
  await prisma.reviewCase.create({ data: { userId: id('pooja'), reason: 'reporters', hides: true, openedAt: ago(3) } });
  await report(men[18], 'rhea', 'nudity_sexual', 1);
  await prisma.reviewCase.create({ data: { userId: id('rhea'), reason: 'serious_report', hides: true, openedAt: ago(1) } });

  // Vikram is on a 3-day ban with an appeal waiting.
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@perspective.test' },
    create: { email: 'admin@perspective.test', passwordHash, totpSecret: generateTotpSecret() },
    update: {},
  });
  await report(women[3], 'vikram', 'harassment_hate', 6);
  await report(women[6], 'vikram', 'harassment_hate', 5);
  await report(women[8], 'vikram', 'harassment_hate', 5);
  await prisma.user.update({ where: { id: id('vikram') }, data: { status: 'suspended', suspendedUntil: new Date(now.getTime() + 2 * DAY) } });
  const ban = await prisma.ban.create({
    data: { userId: id('vikram'), kind: 'temporary', reason: 'Repeated rude messages to people who declined to connect.', endsAt: new Date(now.getTime() + 2 * DAY), createdBy: admin.id, createdAt: ago(1) },
  });
  await prisma.appeal.create({ data: { banId: ban.id, userId: id('vikram'), message: 'I was annoyed but I never meant to be rude. I won’t message people who declined again.', createdAt: ago(0, 5) } });
  await prisma.reviewCase.create({ data: { userId: id('vikram'), reason: 'reporters', hides: true, openedAt: ago(4), closedAt: ago(1), closedBy: admin.id, outcome: 'banned_temporary' } });
  await prisma.adminAuditEntry.create({ data: { adminId: admin.id, action: 'ban_temporary', targetUserId: id('vikram'), reason: ban.reason, createdAt: ago(1) } });

  // Tara blocked two men, so her Blocked people list has entries.
  await prisma.block.createMany({ data: [men[22], men[26]].map((m) => ({ blockerId: id('tara'), blockedId: id(m), createdAt: ago(3) })) });

  const total = world.length;
  console.log(`Test world: removed ${removed.count}, created ${total} people (${world.filter((p) => p.gender === 'man').length} men, ${world.filter((p) => p.gender === 'woman').length} women, ${world.filter((p) => p.gender === 'non_binary').length} non-binary).`);
  console.log('Password for everyone: perspective123. Featured accounts: see business-logic/TEST_WORLD.md');
  for (const p of FEATURED) console.log(`  ${p.name.padEnd(7)} ${p.name.toLowerCase()}${DOMAIN}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
