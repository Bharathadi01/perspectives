import { Inject, Injectable } from '@nestjs/common';
import { addDays, dayKeyFor, todayKey } from '../common/day';
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
    const tz = this.config.APP_TIMEZONE;
    const since = addDays(now, -this.config.BOOST_LOOKBACK_DAYS);
    const [recent, verdicts, reporters, assignedToday, activeOwners] = await Promise.all([
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
      // One row per distinct reporter; reports a reviewer allowed, and those whose reporter deleted their account, do not count.
      this.prisma.report.findMany({
        where: {
          targetType: 'profile',
          targetId: { in: poolIds },
          reporterId: { not: null },
          status: { not: 'allowed' },
          createdAt: { gte: addDays(now, -this.config.REPORT_LOOKBACK_DAYS) },
        },
        distinct: ['targetId', 'reporterId'],
        select: { targetId: true },
      }),
      // Mandatory slots already holding each profile today, across every viewer (over-exposure).
      this.prisma.dailyAssignment.groupBy({
        by: ['targetId'],
        where: { targetId: { in: poolIds }, dayKey: todayKey(tz, now), status: { in: ['pending', 'given'] } },
        _count: { _all: true },
      }),
      // Owners who opened the app recently: a daily-progress row exists once they open Explore or the Inbox.
      this.prisma.dailyProgress.findMany({
        where: { userId: { in: poolIds }, dayKey: { gte: dayKeyFor(addDays(now, -this.config.BOOST_ACTIVE_DAYS), tz) } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);
    const recentBy = new Map(recent.map((r) => [r.ownerId, r._count._all]));
    const reportersBy = new Map<string, number>();
    for (const r of reporters) reportersBy.set(r.targetId, (reportersBy.get(r.targetId) ?? 0) + 1);
    const assignedBy = new Map(assignedToday.map((a) => [a.targetId, a._count._all]));
    const active = new Set(activeOwners.map((a) => a.userId));
    const verdictCount = (giverId: string, verdict: 'helpful' | 'not_helpful') =>
      verdicts.find((v) => v.giverId === giverId && v.verdict === verdict)?._count._all ?? 0;

    return pool.map(({ person }) => {
      const recentReceived = recentBy.get(person.id) ?? 0;
      const assigned = assignedBy.get(person.id) ?? 0;
      const recentReporters = reportersBy.get(person.id) ?? 0;
      const ageMs = now.getTime() - person.createdAt.getTime();
      const compatibility = computeCompatibility(viewer, person);
      const score = rankingScore({
        compatibility: compatibility.score,
        reciprocityNeed: reciprocityNeed(recentReceived + assigned),
        freshness: freshness(ageMs / 86400000),
        qualityPrior: qualityPrior(verdictCount(person.id, 'helpful'), verdictCount(person.id, 'not_helpful')),
        penalties: reportPenalty(recentReporters),
      });
      return {
        id: person.id,
        recentReceived,
        score,
        createdAt: person.createdAt,
        compatibilityScore: compatibility.score,
        matchReasons: compatibility.reasons,
        assignedToday: assigned,
        boostReady:
          this.config.BOOST_ACTIVE_DAYS === 0 ||
          active.has(person.id) ||
          ageMs < this.config.BOOST_NEW_PROFILE_HOURS * 3600000,
        recentReporters,
      };
    });
  }

  /** The target as a candidate if it is still eligible for this viewer (used to validate a pending slot). */
  async findEligible(viewer: Person, targetId: string, now: Date = new Date()): Promise<AssignmentCandidate | null> {
    const list = await this.eligible(viewer, new Set(), now);
    return list.find((c) => c.id === targetId) ?? null;
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
