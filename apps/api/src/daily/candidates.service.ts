import { Inject, Injectable } from '@nestjs/common';
import { addDays, todayKey } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { AssignmentCandidate } from '../domain/assignment';
import { mutuallyVisible } from '../domain/eligibility';
import {
  computeCompatibility,
  datingIntentionCompatibility,
  freshness,
  qualityPrior,
  rankingScore,
  reciprocityNeed,
  reportPenalty,
} from '../domain/ranking';
import { PrismaService } from '../prisma/prisma.service';
import { PERSON_SELECT, Person, SocialService, toPerson } from '../social/social.service';

/**
 * Finds profiles a viewer may be shown, and scores them with the v2 feed ranking.
 * Stage 1: Eligibility (docs/PRODUCT.md & docs/ONBOARDING_AND_MATCHING_RESEARCH.md):
 * live, active, not viewer, not blocked, mutually inside audience, passes hard dealbreakers,
 * has open post, under daily cap.
 * Stage 2 & 3: Compatibility scoring & diversity ranking.
 */
@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async eligible(viewer: Person, exclude: ReadonlySet<string>, now: Date = new Date()): Promise<AssignmentCandidate[]> {
    if (!viewer.isLive || viewer.audience.genders.length === 0) return [];
    const blocked = await this.social.blockedIds(viewer.id);

    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: viewer.id },
        status: 'active',
        profile: { isLive: true, gender: { in: [...viewer.audience.genders] } },
      },
      select: { ...PERSON_SELECT, posts: { where: { status: 'active' }, select: { id: true, category: true } } },
    });

    const people = rows
      .map((row) => ({ person: toPerson(row, now), postIds: row.posts.map((p) => p.id) }))
      .filter(({ person }) => {
        if (blocked.has(person.id) || exclude.has(person.id) || !mutuallyVisible(viewer, person)) {
          return false;
        }
        // Stage 1 Hard Dealbreaker: Dating Intentions
        if (viewer.intentionDealbreaker) {
          const comp = datingIntentionCompatibility(viewer.datingIntention, person.datingIntention);
          if (!comp.compatible) return false;
        }
        if (person.intentionDealbreaker) {
          const comp = datingIntentionCompatibility(person.datingIntention, viewer.datingIntention);
          if (!comp.compatible) return false;
        }
        return true;
      });
    if (people.length === 0) return [];

    const ids = people.map((p) => p.person.id);
    const answered = new Set(
      (
        await this.prisma.perspective.findMany({
          where: { giverId: viewer.id, ownerId: { in: ids } },
          select: { postId: true },
        })
      ).map((p) => p.postId),
    );
    const withOpenPost = people.filter(({ postIds }) => postIds.some((id) => !answered.has(id)));

    const capped = await this.cappedToday(withOpenPost.map((p) => p.person.id), now);
    const pool = withOpenPost.filter(({ person }) => !capped.has(person.id));
    if (pool.length === 0) return [];

    const poolIds = pool.map((p) => p.person.id);
    const since = addDays(now, -this.config.BOOST_LOOKBACK_DAYS);
    const [recent, verdicts, reports] = await Promise.all([
      this.prisma.perspective.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: poolIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.perspective.groupBy({
        by: ['giverId', 'verdict'],
        where: { giverId: { in: poolIds }, verdict: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.report.groupBy({
        by: ['targetId'],
        where: { targetType: 'profile', targetId: { in: poolIds } },
        _count: { _all: true },
      }),
    ]);
    const recentBy = new Map(recent.map((r) => [r.ownerId, r._count._all]));
    const reportsBy = new Map(reports.map((r) => [r.targetId, r._count._all]));
    const verdictCount = (giverId: string, verdict: 'helpful' | 'not_helpful') =>
      verdicts.find((v) => v.giverId === giverId && v.verdict === verdict)?._count._all ?? 0;

    return pool.map(({ person }) => {
      const recentReceived = recentBy.get(person.id) ?? 0;
      const ageDays = (now.getTime() - person.createdAt.getTime()) / 86400000;
      const compatibility = computeCompatibility(viewer, person);
      const score = rankingScore({
        compatibility: compatibility.score,
        reciprocityNeed: reciprocityNeed(recentReceived),
        freshness: freshness(ageDays),
        qualityPrior: qualityPrior(verdictCount(person.id, 'helpful'), verdictCount(person.id, 'not_helpful')),
        penalties: reportPenalty(reportsBy.get(person.id) ?? 0),
      });
      return {
        id: person.id,
        recentReceived,
        score,
        createdAt: person.createdAt,
        compatibilityScore: compatibility.score,
        matchReasons: compatibility.reasons,
      };
    });
  }

  /** Whether a specific target is still eligible for this viewer (used to validate a pending slot). */
  async isEligible(viewer: Person, targetId: string, now: Date = new Date()): Promise<boolean> {
    const list = await this.eligible(viewer, new Set(), now);
    return list.some((c) => c.id === targetId);
  }

  /** Owners who already reached the optional per-day received cap. */
  async cappedToday(ownerIds: string[], now: Date = new Date()): Promise<Set<string>> {
    const cap = this.config.MAX_PERSPECTIVES_RECEIVED_PER_DAY;
    if (cap === null || ownerIds.length === 0) return new Set();
    const counts = await this.prisma.perspective.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: ownerIds }, receivedDayKey: todayKey(this.config.APP_TIMEZONE, now) },
      _count: { _all: true },
    });
    return new Set(counts.filter((c) => c._count._all >= cap).map((c) => c.ownerId));
  }
}
