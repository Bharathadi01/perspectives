import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Post, PostRef, ProfileSummary, PublicProfile, ageFromBirthDate } from '@perspective/contracts';
import { isoDate } from '../common/day';
import { MediaUrlSigner } from '../media/media-url.signer';

export const POST_INCLUDE = {
  media: { select: { id: true, durationSec: true } },
  audioMedia: { select: { id: true, durationSec: true } },
} as const;
export type PostRow = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

export const ACTIVE_POSTS = {
  where: { status: 'active' as const },
  orderBy: { position: 'asc' as const },
  include: POST_INCLUDE,
};

/** User + profile + active posts: everything needed for public and summary views. */
export const PROFILE_USER_INCLUDE = {
  profile: true,
  posts: ACTIVE_POSTS,
} as const;
export type ProfileUserRow = Prisma.UserGetPayload<{ include: typeof PROFILE_USER_INCLUDE }>;

/** Builds allowlisted DTOs. Never returns Prisma entities or private fields. */
@Injectable()
export class ProfileMapper {
  constructor(private readonly signer: MediaUrlSigner) {}

  post(row: PostRow): Post {
    return {
      id: row.id,
      ownerId: row.ownerId,
      position: row.position,
      kind: row.kind,
      mediaUrl: row.media ? this.signer.sign(row.media.id) : null,
      durationSec: row.media?.durationSec ?? null,
      audioMediaUrl: row.audioMedia ? this.signer.sign(row.audioMedia.id) : null,
      audioDurationSec: row.audioMedia?.durationSec ?? null,
      prompt: row.prompt,
      category: row.category,
      focusAreas: row.focusAreas,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  postRef(row: PostRow): PostRef {
    const p = this.post(row);
    return {
      id: p.id,
      kind: p.kind,
      mediaUrl: p.mediaUrl,
      audioMediaUrl: p.audioMediaUrl,
      prompt: p.prompt,
      category: p.category,
    };
  }

  summary(row: ProfileUserRow): ProfileSummary {
    const primary = row.posts.find((p) => p.kind === 'photo');
    return {
      id: row.id,
      displayName: row.profile?.displayName ?? 'Member',
      age: ageFromBirthDate(isoDate(row.birthDate)),
      verified: row.profile?.selfieStatus === 'verified',
      primaryPhotoUrl: primary && primary.media ? this.signer.sign(primary.media.id) : null,
    };
  }

  /** Only live profiles are shown to others, so basics are always present. */
  publicProfile(row: ProfileUserRow): PublicProfile {
    const p = row.profile;
    if (!p || !p.displayName || !p.gender || !p.heightCm || !p.orientation || !p.city) {
      throw new Error('publicProfile called for a profile that is not live');
    }
    return {
      id: row.id,
      displayName: p.displayName,
      age: ageFromBirthDate(isoDate(row.birthDate)),
      gender: p.gender,
      heightCm: p.heightCm,
      orientation: p.orientation,
      city: p.city,
      pronouns: p.pronouns ?? null,
      datingIntention: p.datingIntention ?? null,
      interests: p.interests ?? [],
      lifestylePace: p.lifestylePace ?? null,
      socialPreference: p.socialPreference ?? null,
      personalityPrompts: (p.personalityPrompts as any) ?? [],
      verified: p.selfieStatus === 'verified',
      posts: row.posts.map((post) => this.post(post)),
    };
  }
}
