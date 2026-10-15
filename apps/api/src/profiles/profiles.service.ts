import { Injectable } from '@nestjs/common';
import { MyProfile, ProfileView, UpdateProfileInput, ageFromBirthDate } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { isoDate } from '../common/day';
import { ConnectService } from '../connect/connect.service';
import { missingRequirements, mutuallyVisible } from '../domain/eligibility';
import { SelfieVerifier } from '../moderation/moderation';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';
import { PROFILE_USER_INCLUDE, ProfileMapper, ProfileUserRow } from './profile.mapper';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ProfileMapper,
    private readonly social: SocialService,
    private readonly connect: ConnectService,
    private readonly selfieVerifier: SelfieVerifier,
  ) {}

  async mine(userId: string): Promise<MyProfile> {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: PROFILE_USER_INCLUDE });
    const p = row.profile;
    const missing = this.missingFor(row);
    return {
      id: row.id,
      email: row.email,
      birthDate: isoDate(row.birthDate),
      age: ageFromBirthDate(isoDate(row.birthDate)),
      displayName: p?.displayName ?? null,
      gender: p?.gender ?? null,
      heightCm: p?.heightCm ?? null,
      orientation: p?.orientation ?? null,
      city: p?.city ?? null,
      audience:
        p && p.audienceGenders.length > 0 && p.audienceMinAge !== null && p.audienceMaxAge !== null
          ? { genders: p.audienceGenders, minAge: p.audienceMinAge, maxAge: p.audienceMaxAge }
          : null,
      selfieStatus: p?.selfieStatus ?? 'unverified',
      posts: row.posts.map((post) => this.mapper.post(post)),
      isLive: missing.length === 0,
      missing,
    };
  }

  async update(userId: string, input: UpdateProfileInput): Promise<MyProfile> {
    const { audience, ...basics } = input;
    await this.prisma.profile.update({
      where: { userId },
      data: {
        ...basics,
        ...(audience
          ? { audienceGenders: audience.genders, audienceMinAge: audience.minAge, audienceMaxAge: audience.maxAge }
          : {}),
      },
    });
    await this.recomputeLive(userId);
    return this.mine(userId);
  }

  /** Selfie verification (stubbed verifier). The selfie is private and never served. */
  async verifySelfie(userId: string, mediaId: string): Promise<MyProfile> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId }, include: { post: true } });
    if (!media || media.ownerId !== userId || media.kind !== 'photo' || media.post) {
      throw new AppException('MEDIA_INVALID', 'Upload a new selfie photo to verify.');
    }
    const result = await this.selfieVerifier.verify({ userId, mediaId });
    await this.prisma.$transaction([
      this.prisma.media.update({ where: { id: mediaId }, data: { purpose: 'selfie' } }),
      this.prisma.profile.update({
        where: { userId },
        data: { selfieStatus: result, selfieMediaId: mediaId, selfieCheckedAt: new Date() },
      }),
    ]);
    await this.recomputeLive(userId);
    return this.mine(userId);
  }

  async recomputeLive(userId: string): Promise<void> {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: PROFILE_USER_INCLUDE });
    await this.prisma.profile.update({ where: { userId }, data: { isLive: this.missingFor(row).length === 0 } });
  }

  /**
   * Another person's profile. Visible when both are inside each other's audience, or when they
   * already exchanged perspectives or are connected. Blocks hide people in both directions.
   */
  async view(viewerId: string, targetId: string): Promise<ProfileView> {
    const [viewer, target] = await Promise.all([this.social.person(viewerId), this.social.person(targetId)]);
    const blocks = await this.social.blockState(viewerId, targetId);
    if (!viewer || !target || !target.isLive || viewerId === targetId || blocks.blockedByOther || blocks.viewerBlocked) {
      throw new AppException('NOT_FOUND', 'This profile is not available.');
    }
    const relationship = await this.connect.relationship(viewerId, targetId);
    const known = relationship.gaveToThem || relationship.theyGaveToMe || relationship.connectionId !== null;
    if (!known && !mutuallyVisible(viewer, target)) {
      throw new AppException('PROFILE_NOT_ELIGIBLE', 'This profile is not available.');
    }
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: targetId }, include: PROFILE_USER_INCLUDE });
    const given = await this.prisma.perspective.findMany({
      where: { giverId: viewerId, ownerId: targetId },
      select: { postId: true },
    });
    return { profile: this.mapper.publicProfile(row), relationship, givenPostIds: given.map((g) => g.postId) };
  }

  private missingFor(row: ProfileUserRow) {
    const p = row.profile;
    return missingRequirements({
      displayName: p?.displayName ?? null,
      gender: p?.gender ?? null,
      heightCm: p?.heightCm ?? null,
      orientation: p?.orientation ?? null,
      city: p?.city ?? null,
      audience: {
        genders: p?.audienceGenders ?? [],
        minAge: p?.audienceMinAge ?? null,
        maxAge: p?.audienceMaxAge ?? null,
      },
      selfieVerified: p?.selfieStatus === 'verified',
      hasPrimaryPhotoPost: row.posts.some((post) => post.position === 0 && post.kind === 'photo'),
    });
  }
}
