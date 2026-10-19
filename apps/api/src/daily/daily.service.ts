import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DailyStatus } from '@perspective/contracts';
import { addDays, todayKey } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { AssignmentPolicy, mayHoldMandatorySlot, pickDailySet, pickReplacement } from '../domain/assignment';
import { dailyStatus, mandatoryCount, requiredAfterUnfilledSlot } from '../domain/daily';
import { PrismaService } from '../prisma/prisma.service';
import { Person, SocialService } from '../social/social.service';
import { CandidatesService } from './candidates.service';

export interface PendingSlot {
  targetId: string;
  slot: 'boost' | 'mandatory';
}

/**
 * The daily give-to-get set (docs/PRODUCT.md): each day a user gets a mandatory set (default 3
 * different people, one of them a boost slot for a low-response profile). Giving to all of them
 * unlocks the perspectives received that day. Skipped or invalid slots are replaced; when no
 * replacement exists the requirement shrinks, never below what was already given.
 */
@Injectable()
export class DailyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly candidates: CandidatesService,
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

    const viewer = await this.social.person(userId);
    const picks = viewer
      ? pickDailySet(
          await this.candidates.eligible(viewer, await this.recentlySkipped(userId, now), now),
          mandatoryCount(userId, this.config.DAILY_MANDATORY_COUNT),
          this.policy(userId, dayKey),
        )
      : [];

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

  /** Profiles acted on today (given to or skipped), used for the finite daily batch. */
  async actionsToday(userId: string, now: Date = new Date()): Promise<number> {
    const dayKey = this.today(now);
    const [given, skips] = await Promise.all([
      this.prisma.perspective.findMany({
        where: { giverId: userId, receivedDayKey: dayKey },
        distinct: ['ownerId'],
        select: { ownerId: true },
      }),
      this.prisma.profileSkip.count({ where: { viewerId: userId, dayKey } }),
    ]);
    return given.length + skips;
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
    const replacement = pickReplacement(
      await this.candidates.eligible(viewer, exclude, now),
      slot,
      this.policy(viewer.id, dayKey),
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
