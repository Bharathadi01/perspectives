import { Inject, Injectable } from '@nestjs/common';
import { addDays, dayKeyFor, daysBetweenKeys, todayKey } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { AssignmentCandidate } from '../domain/assignment';
import { mutuallyVisible } from '../domain/eligibility';
import { EnforcementService } from '../enforcement/enforcement.service';
import {
  RankingWeights,
  computeCompatibility,
  givingQuality,
  newMemberScore,
  rankingScore,
  reciprocityNeed,
  recentlyActiveScore,
  reportPenalty,
} from '../domain/ranking';
import { PrismaService } from '../prisma/prisma.service';
import { PERSON_SELECT, Person, SocialService, toPerson } from '../social/social.service';

const DAY_MS = 86400000;

/**
 * Finds the people a viewer may be shown and scores them (docs/PRODUCT.md → Algorithms, 2026-10-20).
 * Eligibility: live, active account, not the viewer, not blocked either way, inside each other's
 * audience, not excluded (already assigned, given to or skipped), still has a post the viewer has not
 * answered, and under the optional hard received cap. Each candidate also carries the facts the
 * daily-set rules need: activity, perspectives received, sets already holding them, and reports.
 */
@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly enforcement: EnforcementService,
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
      .filter(({ person }) => !blocked.has(person.id) && !exclude.has(person.id) && mutuallyVisible(viewer, person));
    if (people.length === 0) return [];

    const ids = people.map((p) => p.person.id);
    const givenRows = await this.prisma.perspective.findMany({
      where: { giverId: viewer.id, ownerId: { in: ids } },
      select: { postId: true, ownerId: true },
    });
    const answered = new Set(givenRows.map((p) => p.postId));
    // Fresh = the viewer never gave this person a perspective (decided 2026-10-20).
    const givenBefore = new Set(givenRows.map((p) => p.ownerId));
    const withOpenPost = people.filter(({ postIds }) => postIds.some((id) => !answered.has(id)));
    if (withOpenPost.length === 0) return [];

    const tz = this.config.APP_TIMEZONE;
    const today = todayKey(tz, now);
    const openIds = withOpenPost.map((p) => p.person.id);
    const receivedTodayBy = await this.receivedToday(openIds, now);
    const hardCap = this.config.MAX_PERSPECTIVES_RECEIVED_PER_DAY;
    // People on hold are hidden from anyone new while an admin reviews them (decided 2026-10-20).
    const held = await this.enforcement.heldIds(openIds);
    const pool = withOpenPost.filter(
      ({ person }) => !held.has(person.id) && (hardCap === null || (receivedTodayBy.get(person.id) ?? 0) < hardCap),
    );
    if (pool.length === 0) return [];

    const poolIds = pool.map((p) => p.person.id);
    const activityWindow = Math.max(7, this.config.MANDATORY_INACTIVE_DAYS, this.config.BOOST_ACTIVE_DAYS);
    const [recent, verdicts, reportersBy, assignedToday, lastActive, weak] = await Promise.all([
      this.prisma.perspective.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: poolIds }, createdAt: { gte: addDays(now, -this.config.BOOST_LOOKBACK_DAYS) } },
        _count: { _all: true },
      }),
      this.prisma.perspective.groupBy({
        by: ['giverId', 'verdict'],
        where: { giverId: { in: poolIds }, verdict: { not: null } },
        _count: { _all: true },
      }),
      this.enforcement.distinctReporters(poolIds, now),
      // Mandatory slots already holding each profile today, across every viewer (over-exposure).
      this.prisma.dailyAssignment.groupBy({
        by: ['targetId'],
        where: { targetId: { in: poolIds }, dayKey: today, status: { in: ['pending', 'given'] } },
        _count: { _all: true },
      }),
      // When each owner last opened the app: a daily-progress row exists once they open Explore or the Inbox.
      this.prisma.dailyProgress.groupBy({
        by: ['userId'],
        where: { userId: { in: poolIds }, dayKey: { gte: dayKeyFor(addDays(now, -activityWindow), tz) } },
        _max: { dayKey: true },
      }),
      // Weak givers are pushed back in Explore; a weak viewer is kept from brand-new members (decided 2026-10-21).
      this.enforcement.weakIds([...poolIds, viewer.id]),
    ]);
    const viewerIsWeak = weak.has(viewer.id);
    const recentBy = new Map(recent.map((r) => [r.ownerId, r._count._all]));
    const assignedBy = new Map(assignedToday.map((a) => [a.targetId, a._count._all]));
    const lastActiveBy = new Map(lastActive.map((a) => [a.userId, a._max.dayKey]));
    const verdictCount = (giverId: string, verdict: 'helpful' | 'not_helpful') =>
      verdicts.find((v) => v.giverId === giverId && v.verdict === verdict)?._count._all ?? 0;
    const weights = this.weights();
    const softLimit = this.config.RECEIVED_SOFT_LIMIT_PER_DAY;
    const inactiveDays = this.config.MANDATORY_INACTIVE_DAYS;

    return pool.map(({ person }) => {
      const recentReceived = recentBy.get(person.id) ?? 0;
      const assigned = assignedBy.get(person.id) ?? 0;
      const recentReporters = reportersBy.get(person.id) ?? 0;
      const ageMs = now.getTime() - person.createdAt.getTime();
      const isNew = ageMs < this.config.BOOST_NEW_PROFILE_HOURS * 3600000;
      const lastKey = lastActiveBy.get(person.id) ?? null;
      // A brand-new account counts as active today even before it opens Explore.
      const daysSinceActive = isNew ? 0 : lastKey ? daysBetweenKeys(lastKey, today) : null;
      const compatibility = computeCompatibility(viewer, person);
      const score = rankingScore(
        {
          sharedInterests: compatibility.score,
          need: reciprocityNeed(recentReceived + assigned),
          recentlyActive: recentlyActiveScore(daysSinceActive),
          newMember: newMemberScore(ageMs / DAY_MS),
          givingQuality: givingQuality(verdictCount(person.id, 'helpful'), verdictCount(person.id, 'not_helpful')),
          fresh: givenBefore.has(person.id) ? 0 : 1,
          penalties: reportPenalty(recentReporters) + (weak.has(person.id) ? this.config.WEAK_GIVER_PENALTY : 0),
        },
        weights,
      );
      return {
        id: person.id,
        recentReceived,
        score,
        createdAt: person.createdAt,
        compatibilityScore: compatibility.score,
        matchReasons: compatibility.reasons,
        assignedToday: assigned,
        boostReady:
          this.config.BOOST_ACTIVE_DAYS === 0 || (daysSinceActive !== null && daysSinceActive <= this.config.BOOST_ACTIVE_DAYS),
        recentReporters,
        dormant: inactiveDays > 0 && (daysSinceActive === null || daysSinceActive > inactiveDays),
        atSoftLimit: softLimit > 0 && (receivedTodayBy.get(person.id) ?? 0) >= softLimit,
        fresh: !givenBefore.has(person.id),
        shielded: viewerIsWeak && newMemberScore(ageMs / DAY_MS) > 0,
      };
    });
  }

  /** The target as a candidate if it is still eligible for this viewer (used to validate a pending slot). */
  async findEligible(viewer: Person, targetId: string, now: Date = new Date()): Promise<AssignmentCandidate | null> {
    const list = await this.eligible(viewer, new Set(), now);
    return list.find((c) => c.id === targetId) ?? null;
  }

  /** Owners who reached the optional hard received cap today (none unless the cap is set). */
  async cappedToday(ownerIds: string[], now: Date = new Date()): Promise<Set<string>> {
    const cap = this.config.MAX_PERSPECTIVES_RECEIVED_PER_DAY;
    if (cap === null || ownerIds.length === 0) return new Set();
    const counts = await this.receivedToday(ownerIds, now);
    return new Set([...counts].filter(([, n]) => n >= cap).map(([id]) => id));
  }

  /** Perspectives each owner received today (by the day they arrived). */
  private async receivedToday(ownerIds: string[], now: Date): Promise<Map<string, number>> {
    if (ownerIds.length === 0) return new Map();
    const counts = await this.prisma.perspective.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: ownerIds }, receivedDayKey: todayKey(this.config.APP_TIMEZONE, now) },
      _count: { _all: true },
    });
    return new Map(counts.map((c) => [c.ownerId, c._count._all]));
  }

  private weights(): RankingWeights {
    return {
      sharedInterests: this.config.RANK_WEIGHT_INTERESTS,
      need: this.config.RANK_WEIGHT_NEED,
      recentlyActive: this.config.RANK_WEIGHT_ACTIVE,
      newMember: this.config.RANK_WEIGHT_NEW_MEMBER,
      givingQuality: this.config.RANK_WEIGHT_QUALITY,
      fresh: this.config.RANK_WEIGHT_FRESH,
    };
  }
}
