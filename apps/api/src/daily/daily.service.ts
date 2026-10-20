import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RULES, type DailyStatus } from '@perspective/contracts';
import { addDays, todayKey } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import {
  AssignmentCandidate,
  AssignmentPolicy,
  freshFirstPool,
  mandatoryPoolSize,
  mayHoldMandatorySlot,
  pickDailySet,
  pickReplacement,
} from '../domain/assignment';
import { PoolThresholds, dailyStatus, mandatoryCount, requiredAfterUnfilledSlot } from '../domain/daily';
import { AgeRange, WideningPolicy, needsWidening, nextWidening } from '../domain/widening';
import { EnforcementService } from '../enforcement/enforcement.service';
import { NoticesService } from '../notices/notices.service';
import { PrismaService } from '../prisma/prisma.service';
import { Person, SocialService } from '../social/social.service';
import { CandidatesService } from './candidates.service';

export interface PendingSlot {
  targetId: string;
  slot: 'boost' | 'mandatory';
}

/**
 * The daily give-to-get set (docs/PRODUCT.md, decided 2026-10-20): each day a user gets a mandatory
 * set of 1, 2 or 3 different people, depending on how many could fill a slot for them; one may be a
 * boost slot for an active person with no recent perspectives. Giving to all of them unlocks the
 * perspectives received that day. Skipped or invalid slots are replaced; when no replacement exists
 * the requirement shrinks, never below what was already given.
 */
@Injectable()
export class DailyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly candidates: CandidatesService,
    private readonly notices: NoticesService,
    private readonly enforcement: EnforcementService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  today(now: Date = new Date()): string {
    return todayKey(this.config.APP_TIMEZONE, now);
  }

  async status(userId: string, now: Date = new Date()): Promise<DailyStatus> {
    const dayKey = this.today(now);
    const progress = await this.ensureDay(userId, now);
    const given = await this.prisma.dailyAssignment.count({ where: { userId, dayKey, status: 'given' } });
    return dailyStatus(dayKey, progress.requiredCount, given);
  }

  /** Creates today's mandatory set on first use. Safe under concurrent calls. */
  async ensureDay(userId: string, now: Date = new Date()): Promise<{ requiredCount: number }> {
    const dayKey = this.today(now);
    const existing = await this.prisma.dailyProgress.findUnique({ where: { userId_dayKey: { userId, dayKey } } });
    if (existing) return existing;

    // Once a day, re-check this person's own giving quality, so faded marks clear the weak-giver state.
    await this.enforcement.reassessGiver(userId, now);
    const viewer = await this.social.person(userId);
    const policy = this.policy(userId, dayKey);
    // Skipped and already-given people stay out (matters when the set is rebuilt after an audience change).
    const skipped = await this.excludedToday(userId, now);
    let candidates = viewer ? await this.candidates.eligible(viewer, skipped, now) : [];
    if (viewer?.isLive) candidates = await this.widenIfNeeded(viewer, candidates, skipped, dayKey, now);
    // Fresh people first: returning people only join when fewer than POOL_PARTIAL_AT fresh ones are left.
    const pool = this.freshFirst(candidates, policy);
    const count = mandatoryCount(mandatoryPoolSize(pool, policy), this.config.DAILY_MANDATORY_COUNT, this.thresholds());
    const picks = pickDailySet(pool, count, policy);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const progress = await tx.dailyProgress.create({
          data: { userId, dayKey, requiredCount: picks.length, unlockedAt: picks.length === 0 ? now : null },
        });
        if (picks.length > 0) {
          await tx.dailyAssignment.createMany({
            data: picks.map((p, i) => ({ userId, dayKey, slotIndex: i, targetId: p.id, slot: p.slot })),
          });
        }
        return progress;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.dailyProgress.findUniqueOrThrow({ where: { userId_dayKey: { userId, dayKey } } });
      }
      throw err;
    }
  }

  /**
   * The person saved a new audience (decided 2026-10-20). Today's mandatory set follows it:
   * - nothing given yet: the whole set is rebuilt from the new audience (count and widening included);
   * - part of the set given: what was given stays, the age range may widen, and the slots still
   *   waiting are re-checked the next time they are shown (replaced when the new audience excludes them);
   * - set finished: nothing is rebuilt; the age range may widen, and the profiles after the set are
   *   always picked from the current audience.
   * With no set for today yet, nothing is needed: the first visit builds it from the new audience.
   */
  async onAudienceChanged(userId: string, now: Date = new Date()): Promise<void> {
    const dayKey = this.today(now);
    const progress = await this.prisma.dailyProgress.findUnique({ where: { userId_dayKey: { userId, dayKey } } });
    if (!progress) return;
    const givenInSet = await this.prisma.dailyAssignment.count({ where: { userId, dayKey, status: 'given' } });
    if (givenInSet === 0) {
      await this.prisma.$transaction([
        this.prisma.dailyAssignment.deleteMany({ where: { userId, dayKey } }),
        this.prisma.dailyProgress.delete({ where: { userId_dayKey: { userId, dayKey } } }),
      ]);
      await this.ensureDay(userId, now);
      return;
    }
    const viewer = await this.social.person(userId);
    if (!viewer?.isLive) return;
    const skipped = await this.recentlySkipped(userId, now);
    await this.widenIfNeeded(viewer, await this.candidates.eligible(viewer, skipped, now), skipped, dayKey, now);
  }

  /**
   * Automatic age widening (decided 2026-10-20): when fewer people than a set of 2 needs are
   * available, widen the age range 2 years at each end at a time, up to 4 beyond the chosen range,
   * never below 18 and never by gender. Only steps that bring in more people are kept. The new
   * range is saved and the person gets a notice; returns the candidates for the range in use.
   */
  private async widenIfNeeded(
    viewer: Person,
    candidates: AssignmentCandidate[],
    skipped: Set<string>,
    dayKey: string,
    now: Date,
  ): Promise<AssignmentCandidate[]> {
    const policy = this.policy(viewer.id, dayKey);
    const partialAt = this.config.POOL_PARTIAL_AT;
    if (!needsWidening(mandatoryPoolSize(this.freshFirst(candidates, policy), policy), partialAt)) return candidates;
    const row = await this.prisma.profile.findUnique({
      where: { userId: viewer.id },
      select: { audienceMinAge: true, audienceMaxAge: true, audienceChosenMinAge: true, audienceChosenMaxAge: true },
    });
    if (!row || row.audienceMinAge === null || row.audienceMaxAge === null) return candidates;
    const chosen: AgeRange = {
      minAge: row.audienceChosenMinAge ?? row.audienceMinAge,
      maxAge: row.audienceChosenMaxAge ?? row.audienceMaxAge,
    };

    let range: AgeRange = { minAge: row.audienceMinAge, maxAge: row.audienceMaxAge };
    let best = { range, candidates, pool: mandatoryPoolSize(this.freshFirst(candidates, policy), policy) };
    for (let next = nextWidening(chosen, range, this.widening()); next; next = nextWidening(chosen, range, this.widening())) {
      range = next;
      const widened = await this.candidates.eligible({ ...viewer, audience: { ...viewer.audience, ...range } }, skipped, now);
      const pool = mandatoryPoolSize(this.freshFirst(widened, policy), policy);
      if (pool > best.pool) best = { range, candidates: widened, pool };
      if (!needsWidening(pool, partialAt)) break;
    }
    if (best.range.minAge === row.audienceMinAge && best.range.maxAge === row.audienceMaxAge) return candidates;

    await this.prisma.profile.update({
      where: { userId: viewer.id },
      data: {
        audienceMinAge: best.range.minAge,
        audienceMaxAge: best.range.maxAge,
        audienceChosenMinAge: chosen.minAge,
        audienceChosenMaxAge: chosen.maxAge,
      },
    });
    await this.notices.audienceWidened(viewer.id, dayKey, best.range, chosen);
    return best.candidates;
  }

  private widening(): WideningPolicy {
    return {
      stepYears: this.config.AUDIENCE_WIDEN_STEP_YEARS,
      maxYears: this.config.AUDIENCE_WIDEN_MAX_YEARS,
      floor: RULES.minAge,
      ceiling: RULES.maxAudienceAge,
    };
  }

  /**
   * The people today's set (or the profiles after it) are drawn from: fresh people only while at
   * least POOL_PARTIAL_AT of them are left, otherwise fresh and returning people together
   * (decided 2026-10-20). With a policy, only fresh people who may hold a mandatory slot count.
   */
  freshFirst(candidates: AssignmentCandidate[], policy?: AssignmentPolicy, usedFresh = 0): AssignmentCandidate[] {
    const counts = policy ? (c: AssignmentCandidate) => mayHoldMandatorySlot(c, policy) : undefined;
    return freshFirstPool(candidates, this.config.POOL_PARTIAL_AT, usedFresh, counts);
  }

  /** Pool-size thresholds for the 1/2/3 daily count and the after-set count. */
  thresholds(): PoolThresholds {
    return { full: this.config.POOL_FULL_AT, partial: this.config.POOL_PARTIAL_AT };
  }

  /** Over-exposure and safety rules for building this viewer's set today (seeded per viewer and day). */
  private policy(userId: string, dayKey: string): AssignmentPolicy {
    const cap = this.config.MAX_MANDATORY_ASSIGNMENTS_PER_PROFILE_PER_DAY;
    return {
      seed: `${userId}:${dayKey}`,
      assignCap: cap === 0 ? null : cap,
      boostPoolSize: this.config.BOOST_CANDIDATE_POOL,
      pauseReporters: this.config.REPORT_PAUSE_REPORTERS,
    };
  }

  /**
   * The next mandatory profile to show. Slots whose profile became ineligible (blocked, went
   * offline, nothing left to answer, or reported by enough different people) are replaced first.
   */
  async nextPendingSlot(userId: string, now: Date = new Date()): Promise<PendingSlot | null> {
    const dayKey = this.today(now);
    await this.ensureDay(userId, now);
    const viewer = await this.social.person(userId);
    if (!viewer) return null;

    for (let guard = 0; guard < 50; guard++) {
      const slot = await this.prisma.dailyAssignment.findFirst({
        where: { userId, dayKey, status: 'pending' },
        orderBy: { slotIndex: 'asc' },
      });
      if (!slot) return null;
      const candidate = await this.candidates.findEligible(viewer, slot.targetId, now);
      if (candidate && mayHoldMandatorySlot(candidate, this.policy(userId, dayKey))) {
        return { targetId: slot.targetId, slot: slot.slot };
      }
      await this.prisma.dailyAssignment.update({ where: { id: slot.id }, data: { status: 'replaced' } });
      await this.refillSlot(viewer, slot.slot, now);
    }
    return null;
  }

  /** Called after a perspective is given; counts once per assigned person. */
  async markGiven(userId: string, targetId: string, now: Date = new Date()): Promise<void> {
    const dayKey = this.today(now);
    await this.prisma.dailyAssignment.updateMany({
      where: { userId, dayKey, targetId, status: 'pending' },
      data: { status: 'given' },
    });
    await this.maybeUnlock(userId, now);
  }

  /** Skips a profile privately. A skipped mandatory slot is replaced with another eligible profile. */
  async skip(userId: string, targetId: string, now: Date = new Date()): Promise<void> {
    const dayKey = this.today(now);
    await this.ensureDay(userId, now);
    await this.prisma.profileSkip.create({ data: { viewerId: userId, targetId, dayKey } });
    const slot = await this.prisma.dailyAssignment.findFirst({
      where: { userId, dayKey, targetId, status: 'pending' },
    });
    if (!slot) return;
    await this.prisma.dailyAssignment.update({ where: { id: slot.id }, data: { status: 'skipped' } });
    const viewer = await this.social.person(userId);
    if (viewer) await this.refillSlot(viewer, slot.slot, now);
  }

  /** Latest day on which the user completed the set; received items up to that day are revealed. */
  async latestUnlockedDay(userId: string): Promise<string | null> {
    const row = await this.prisma.dailyProgress.findFirst({
      where: { userId, unlockedAt: { not: null } },
      orderBy: { dayKey: 'desc' },
      select: { dayKey: true },
    });
    return row?.dayKey ?? null;
  }

  /**
   * Profiles acted on today (given to or skipped) that were not in today's mandatory set: the
   * profiles used up from the after-set allowance.
   */
  async afterSetUsage(userId: string, now: Date = new Date()): Promise<{ used: number; usedFresh: number }> {
    const dayKey = this.today(now);
    const [assigned, given, skips] = await Promise.all([
      this.prisma.dailyAssignment.findMany({ where: { userId, dayKey }, select: { targetId: true } }),
      this.prisma.perspective.findMany({
        where: { giverId: userId, receivedDayKey: dayKey },
        distinct: ['ownerId'],
        select: { ownerId: true },
      }),
      this.prisma.profileSkip.findMany({ where: { viewerId: userId, dayKey }, select: { targetId: true } }),
    ]);
    const inSet = new Set(assigned.map((a) => a.targetId));
    const acted = new Set([...given.map((g) => g.ownerId), ...skips.map((s) => s.targetId)]);
    const afterSet = [...acted].filter((id) => !inSet.has(id));
    // Fresh = the viewer had never given them a perspective before today.
    const before =
      afterSet.length === 0
        ? []
        : await this.prisma.perspective.findMany({
            where: { giverId: userId, ownerId: { in: afterSet }, receivedDayKey: { not: dayKey } },
            distinct: ['ownerId'],
            select: { ownerId: true },
          });
    const returning = new Set(before.map((b) => b.ownerId));
    return { used: afterSet.length, usedFresh: afterSet.filter((id) => !returning.has(id)).length };
  }

  /** People to keep out of today's Explore: assigned today, skipped recently, or given to today. */
  async excludedToday(userId: string, now: Date = new Date()): Promise<Set<string>> {
    const dayKey = this.today(now);
    const [assigned, skipped, given] = await Promise.all([
      this.prisma.dailyAssignment.findMany({ where: { userId, dayKey }, select: { targetId: true } }),
      this.recentlySkipped(userId, now),
      this.prisma.perspective.findMany({
        where: { giverId: userId, receivedDayKey: dayKey },
        select: { ownerId: true },
      }),
    ]);
    return new Set([...assigned.map((a) => a.targetId), ...skipped, ...given.map((g) => g.ownerId)]);
  }

  private async recentlySkipped(userId: string, now: Date): Promise<Set<string>> {
    if (this.config.SKIP_HIDE_DAYS === 0) return new Set();
    const rows = await this.prisma.profileSkip.findMany({
      where: { viewerId: userId, createdAt: { gte: addDays(now, -this.config.SKIP_HIDE_DAYS) } },
      select: { targetId: true },
    });
    return new Set(rows.map((r) => r.targetId));
  }

  private async refillSlot(viewer: Person, slot: 'boost' | 'mandatory', now: Date): Promise<void> {
    const dayKey = this.today(now);
    const exclude = await this.excludedToday(viewer.id, now);
    const last = await this.prisma.dailyAssignment.findFirst({
      where: { userId: viewer.id, dayKey },
      orderBy: { slotIndex: 'desc' },
      select: { slotIndex: true },
    });
    const slotIndex = (last?.slotIndex ?? -1) + 1;
    const policy = this.policy(viewer.id, dayKey);
    const replacement = pickReplacement(
      this.freshFirst(await this.candidates.eligible(viewer, exclude, now), policy),
      slot,
      policy,
      slotIndex,
    );
    if (replacement) {
      await this.prisma.dailyAssignment.create({
        data: { userId: viewer.id, dayKey, slotIndex, targetId: replacement.id, slot: replacement.slot },
      });
      return;
    }
    const progress = await this.ensureDay(viewer.id, now);
    const given = await this.prisma.dailyAssignment.count({ where: { userId: viewer.id, dayKey, status: 'given' } });
    await this.prisma.dailyProgress.update({
      where: { userId_dayKey: { userId: viewer.id, dayKey } },
      data: { requiredCount: requiredAfterUnfilledSlot(progress.requiredCount, given) },
    });
    await this.maybeUnlock(viewer.id, now);
  }

  private async maybeUnlock(userId: string, now: Date): Promise<void> {
    const dayKey = this.today(now);
    const progress = await this.prisma.dailyProgress.findUnique({ where: { userId_dayKey: { userId, dayKey } } });
    if (!progress || progress.unlockedAt) return;
    const given = await this.prisma.dailyAssignment.count({ where: { userId, dayKey, status: 'given' } });
    if (given >= progress.requiredCount) {
      await this.prisma.dailyProgress.update({
        where: { userId_dayKey: { userId, dayKey } },
        data: { unlockedAt: now },
      });
    }
  }
}
