import { Global, Injectable, Module } from '@nestjs/common';
import type { Gender, LifestylePace, PostCategory, SocialPreference } from '@perspective/contracts';
import { ageFromBirthDate } from '@perspective/contracts';
import { isoDate } from '../common/day';
import { AudiencePerson } from '../domain/eligibility';
import { PrismaService } from '../prisma/prisma.service';

export interface Person extends AudiencePerson {
  id: string;
  isActive: boolean;
  isLive: boolean;
  createdAt: Date;
  postCategories: PostCategory[];
  interests: string[];
  lifestylePace: LifestylePace | null;
  socialPreference: SocialPreference | null;
  heightCm: number | null;
  city: string | null;
}

type PersonRow = {
  id: string;
  status: string;
  birthDate: Date;
  createdAt: Date;
  profile: {
    gender: Gender | null;
    audienceGenders: Gender[];
    audienceMinAge: number | null;
    audienceMaxAge: number | null;
    interests: string[];
    lifestylePace: LifestylePace | null;
    socialPreference: SocialPreference | null;
    heightCm: number | null;
    city: string | null;
    isLive: boolean;
    createdAt: Date;
  } | null;
  posts: { category: PostCategory }[];
};

export const PERSON_SELECT = {
  id: true,
  status: true,
  birthDate: true,
  createdAt: true,
  profile: {
    select: {
      gender: true,
      audienceGenders: true,
      audienceMinAge: true,
      audienceMaxAge: true,
      interests: true,
      lifestylePace: true,
      socialPreference: true,
      heightCm: true,
      city: true,
      isLive: true,
      createdAt: true,
    },
  },
  posts: { where: { status: 'active' as const }, select: { category: true } },
} as const;

export function toPerson(row: PersonRow, now: Date = new Date()): Person {
  return {
    id: row.id,
    isActive: row.status === 'active',
    isLive: row.status === 'active' && (row.profile?.isLive ?? false),
    createdAt: row.profile?.createdAt ?? row.createdAt,
    gender: row.profile?.gender ?? null,
    age: ageFromBirthDate(isoDate(row.birthDate), now),
    audience: {
      genders: row.profile?.audienceGenders ?? [],
      minAge: row.profile?.audienceMinAge ?? null,
      maxAge: row.profile?.audienceMaxAge ?? null,
    },
    postCategories: row.posts.map((p) => p.category),
    interests: row.profile?.interests ?? [],
    lifestylePace: row.profile?.lifestylePace ?? null,
    socialPreference: row.profile?.socialPreference ?? null,
    heightCm: row.profile?.heightCm ?? null,
    city: row.profile?.city ?? null,
  };
}

/** People, blocks, and other relationship lookups shared by the feature modules. */
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async person(userId: string): Promise<Person | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: PERSON_SELECT });
    return row ? toPerson(row) : null;
  }

  /** Everyone the user blocked or was blocked by. Blocks hide people in both directions. */
  async blockedIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
  }

  async blockState(viewerId: string, otherId: string): Promise<{ viewerBlocked: boolean; blockedByOther: boolean }> {
    const rows = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: otherId },
          { blockerId: otherId, blockedId: viewerId },
        ],
      },
      select: { blockerId: true },
    });
    return {
      viewerBlocked: rows.some((r) => r.blockerId === viewerId),
      blockedByOther: rows.some((r) => r.blockerId === otherId),
    };
  }

  async hasGivenTo(giverId: string, ownerId: string): Promise<boolean> {
    const count = await this.prisma.perspective.count({
      where: { giverId, ownerId, status: { not: 'removed' } },
    });
    return count > 0;
  }
}

@Global()
@Module({ providers: [SocialService], exports: [SocialService] })
export class SocialModule {}
