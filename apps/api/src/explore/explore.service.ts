import { Inject, Injectable } from '@nestjs/common';
import { ExploreCard, ExploreResponse, ExploreSlot } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { CandidatesService } from '../daily/candidates.service';
import { DailyService } from '../daily/daily.service';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { SocialService } from '../social/social.service';

/**
 * Explore shows one profile at a time: first today's mandatory set (with its boost slot), then
 * optional profiles until the finite daily batch is used up. No infinite scroll.
 */
@Injectable()
export class ExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly daily: DailyService,
    private readonly candidates: CandidatesService,
    private readonly social: SocialService,
    private readonly mapper: ProfileMapper,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async next(viewerId: string, now: Date = new Date()): Promise<ExploreResponse> {
    const pending = await this.daily.nextPendingSlot(viewerId, now);
    const daily = await this.daily.status(viewerId, now);
    const actions = await this.daily.actionsToday(viewerId, now);
    const batchLeft = Math.max(0, this.config.DAILY_BATCH_SIZE - actions);

    if (pending) {
      return {
        daily,
        card: await this.card(viewerId, pending.targetId, pending.slot),
        remainingInBatch: Math.max(daily.requiredCount - daily.givenCount, batchLeft),
      };
    }
    if (batchLeft === 0) {
      return { daily, card: null, remainingInBatch: 0 };
    }
    const viewer = await this.social.person(viewerId);
    if (!viewer) throw new AppException('UNAUTHORIZED', 'Please sign in.');
    const pool = await this.candidates.eligible(viewer, await this.daily.excludedToday(viewerId, now), now);
    const best = [...pool].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0];
    return {
      daily,
      card: best ? await this.card(viewerId, best.id, 'optional') : null,
      remainingInBatch: best ? batchLeft : 0,
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
    const given = await this.prisma.perspective.findMany({
      where: { giverId: viewerId, ownerId: targetId },
      select: { postId: true },
    });
    return { profile: this.mapper.publicProfile(row), slot, givenPostIds: given.map((g) => g.postId) };
  }
}
