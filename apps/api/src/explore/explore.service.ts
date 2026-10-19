import { Injectable } from '@nestjs/common';
import { ExploreCard, ExploreResponse, ExploreSlot } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { CandidatesService } from '../daily/candidates.service';
import { DailyService } from '../daily/daily.service';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { SocialService } from '../social/social.service';
import { pickAfterSetProfile } from '../domain/assignment';
import { bonusCount } from '../domain/daily';
import { computeCompatibility } from '../domain/ranking';

/**
 * Explore shows one profile at a time: first today's mandatory set, then 4 to 5 more profiles
 * (fewer when the pool is small), the last being a random discovery pick. No infinite scroll.
 */
@Injectable()
export class ExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly daily: DailyService,
    private readonly candidates: CandidatesService,
    private readonly social: SocialService,
    private readonly mapper: ProfileMapper,
  ) {}

  async next(viewerId: string, now: Date = new Date()): Promise<ExploreResponse> {
    const pending = await this.daily.nextPendingSlot(viewerId, now);
    const daily = await this.daily.status(viewerId, now);

    if (pending) {
      // The boost card looks like any other card in the set (decided 2026-10-20): no "few perspectives" note.
      return {
        daily,
        card: await this.card(viewerId, pending.targetId, 'mandatory'),
        remainingInBatch: Math.max(0, daily.requiredCount - daily.givenCount),
      };
    }

    // After the set: 5 more at 15+ people left, 4 at 6 to 14, fewer below; the last one is a random discovery pick.
    const viewer = await this.social.person(viewerId);
    if (!viewer) throw new AppException('UNAUTHORIZED', 'Please sign in.');
    const pool = await this.candidates.eligible(viewer, await this.daily.excludedToday(viewerId, now), now);
    const used = await this.daily.afterSetActionsToday(viewerId, now);
    const left = Math.max(0, bonusCount(pool.length + used, this.daily.thresholds()) - used);
    const next = pickAfterSetProfile(pool, left, `${viewerId}:${daily.dayKey}`);
    return {
      daily,
      card: next ? await this.card(viewerId, next.id, 'optional') : null,
      remainingInBatch: next ? left : 0,
    };
  }

  async skip(viewerId: string, profileId: string, now: Date = new Date()): Promise<ExploreResponse> {
    if (profileId === viewerId || !(await this.social.person(profileId))) {
      throw new AppException('NOT_FOUND', 'Profile not found.');
    }
    await this.daily.skip(viewerId, profileId, now);
    return this.next(viewerId, now);
  }

  private async card(viewerId: string, targetId: string, slot: ExploreSlot): Promise<ExploreCard> {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: targetId }, include: PROFILE_USER_INCLUDE });
    const [viewer, target] = await Promise.all([this.social.person(viewerId), this.social.person(targetId)]);
    const comp = viewer && target ? computeCompatibility(viewer, target) : null;
    const given = await this.prisma.perspective.findMany({
      where: { giverId: viewerId, ownerId: targetId },
      select: { postId: true },
    });
    return {
      profile: this.mapper.publicProfile(row),
      slot,
      givenPostIds: given.map((g) => g.postId),
      compatibilityScore: comp ? Number(comp.score.toFixed(2)) : undefined,
      matchReasons: comp?.reasons,
    };
  }
}
