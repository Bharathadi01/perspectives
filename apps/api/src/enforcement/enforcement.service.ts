import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { NotHelpfulReason, ReportReason, ReportTargetType } from '@perspective/contracts';
import { addDays } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import {
  LOW_EFFORT_REASONS,
  QualityMark,
  QualityPolicy,
  assessGiver,
  holdReason,
  isHarshMarker,
  isSeriousReason,
  reportReasonForMark,
  shouldFlagWeakGiver,
  suspensionOver,
} from '../domain/enforcement';
import { NoticesService } from '../notices/notices.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reports, holds, the weak-giver quality loop and the end of temporary bans (docs/PRODUCT.md →
 * Reports, holds and bans). Automatic steps only hold or flag; bans are admin decisions (AdminService).
 */
@Injectable()
export class EnforcementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notices: NoticesService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** The person a report is about: profile owner, post owner, perspective giver or message sender. */
  async subjectOf(targetType: ReportTargetType, targetId: string): Promise<string | null> {
    switch (targetType) {
      case 'profile':
        return (await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }))?.id ?? null;
      case 'post':
        return (await this.prisma.post.findUnique({ where: { id: targetId }, select: { ownerId: true } }))?.ownerId ?? null;
      case 'perspective':
        return (await this.prisma.perspective.findUnique({ where: { id: targetId }, select: { giverId: true } }))?.giverId ?? null;
      case 'message':
        return (await this.prisma.message.findUnique({ where: { id: targetId }, select: { senderId: true } }))?.senderId ?? null;
    }
  }

  /** Saves a report about a person and applies any hold it triggers. */
  async fileReport(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    note?: string | null;
    fromFeedback?: boolean;
  }): Promise<{ reportId: string }> {
    const subjectId = await this.subjectOf(input.targetType, input.targetId);
    const report = await this.prisma.report.create({
      data: {
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note ?? null,
        subjectId,
        fromFeedback: input.fromFeedback ?? false,
      },
      select: { id: true },
    });
    if (subjectId && subjectId !== input.reporterId) await this.reviewReports(subjectId, input);
    return { reportId: report.id };
  }

  /**
   * An owner marked a perspective (decided 2026-10-21). Insulting, sexual and unsafe count as a
   * report on the giver (once per perspective); every mark re-checks the giver's quality.
   */
  async onFeedback(perspective: { id: string; giverId: string; ownerId: string }, reason: NotHelpfulReason | null): Promise<void> {
    const asReport = reason ? reportReasonForMark(reason) : null;
    if (asReport) {
      const existing = await this.prisma.report.findFirst({
        where: { reporterId: perspective.ownerId, targetType: 'perspective', targetId: perspective.id, fromFeedback: true },
        select: { id: true },
      });
      if (!existing) {
        await this.fileReport({
          reporterId: perspective.ownerId,
          targetType: 'perspective',
          targetId: perspective.id,
          reason: asReport,
          fromFeedback: true,
        });
      }
    }
    await this.reassessGiver(perspective.giverId);
  }

  /** Different people who reported each person in the report window (dismissed reports do not count). */
  async distinctReporters(personIds: string[], now: Date = new Date()): Promise<Map<string, number>> {
    if (personIds.length === 0) return new Map();
    const rows = await this.prisma.report.findMany({
      where: {
        subjectId: { in: personIds },
        reporterId: { not: null },
        status: { not: 'allowed' },
        createdAt: { gte: addDays(now, -this.config.REPORT_LOOKBACK_DAYS) },
      },
      distinct: ['subjectId', 'reporterId'],
      select: { subjectId: true, reporterId: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.subjectId || r.subjectId === r.reporterId) continue;
      counts.set(r.subjectId, (counts.get(r.subjectId) ?? 0) + 1);
    }
    return counts;
  }

  /** People hidden from anyone new while an admin reviews them (an open hold). */
  async heldIds(personIds: string[]): Promise<Set<string>> {
    if (personIds.length === 0) return new Set();
    const rows = await this.prisma.reviewCase.findMany({
      where: { userId: { in: personIds }, closedAt: null, hides: true },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  async isHeld(personId: string): Promise<boolean> {
    return (await this.heldIds([personId])).has(personId);
  }

  /** Current weak givers among these people (pushed back in Explore, kept from brand-new members). */
  async weakIds(personIds: string[]): Promise<Set<string>> {
    if (personIds.length === 0) return new Set();
    const rows = await this.prisma.giverQuality.findMany({ where: { userId: { in: personIds }, weak: true }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  }

  /**
   * The weak-giver quality loop (decided 2026-10-21). Over the line for the first time: a private tip.
   * Still over it after 10 more low-effort marks from 5 people: on the admin's list. Back under it:
   * everything clears by itself.
   */
  async reassessGiver(giverId: string, now: Date = new Date()): Promise<void> {
    const p = this.qualityPolicy();
    const since = addDays(now, -p.fadeDays);
    const rows = await this.prisma.perspective.findMany({
      where: { giverId, verdict: { not: null }, feedbackAt: { gte: since } },
      select: { ownerId: true, verdict: true, notHelpfulReason: true, feedbackAt: true },
    });
    const existing = await this.prisma.giverQuality.findUnique({ where: { userId: giverId } });
    if (rows.length === 0 && !existing) return;

    const marks: QualityMark[] = [];
    for (const r of rows) {
      if (r.verdict === 'helpful') marks.push({ markerId: r.ownerId, kind: 'helpful', at: r.feedbackAt! });
      else if (r.notHelpfulReason && LOW_EFFORT_REASONS.includes(r.notHelpfulReason)) {
        marks.push({ markerId: r.ownerId, kind: 'low_effort', at: r.feedbackAt! });
      }
    }
    const harsh = await this.harshMarkers([...new Set(marks.map((m) => m.markerId))], since);
    const a = assessGiver(marks, harsh, now, p);

    const data: { weak: boolean; lowEffortMarks: number; helpfulMarks: number; weakSince?: Date | null; flaggedAt?: Date | null } = {
      weak: a.weak,
      lowEffortMarks: a.lowEffort,
      helpfulMarks: a.helpful,
    };
    let sendTip = false;
    let flag = false;
    if (a.weak && !existing?.weak) {
      data.weakSince = now;
      data.flaggedAt = null;
      sendTip = true;
    } else if (a.weak && existing?.weakSince && !existing.flaggedAt && shouldFlagWeakGiver(marks, existing.weakSince, true, p)) {
      data.flaggedAt = now;
      flag = true;
    } else if (!a.weak && existing?.weak) {
      data.weakSince = null;
      data.flaggedAt = null;
    }
    await this.prisma.giverQuality.upsert({ where: { userId: giverId }, create: { userId: giverId, ...data }, update: data });
    if (sendTip) await this.notices.create(giverId, 'weak_giver_tip', {}, `weak_giver_tip:${now.toISOString()}`);
    if (flag) await this.openCase(giverId, 'weak_giver', false);
  }

  /** Temporary bans whose end has passed return to active (also checked lazily on sign-in). */
  async liftEndedBans(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.user.updateMany({
      where: { status: 'suspended', suspendedUntil: { lte: now } },
      data: { status: 'active', suspendedUntil: null },
    });
    return res.count;
  }

  /** Lifts this person's temporary ban if it is over. Returns their current status. */
  async refreshStatus(userId: string, now: Date = new Date()): Promise<{ status: 'active' | 'suspended' | 'banned'; suspendedUntil: Date | null } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true, suspendedUntil: true } });
    if (!user) return null;
    if (suspensionOver(user.status, user.suspendedUntil, now)) {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'active', suspendedUntil: null } });
      return { status: 'active', suspendedUntil: null };
    }
    return user;
  }

  qualityPolicy(): QualityPolicy {
    return {
      fadeDays: this.config.MARK_FADE_DAYS,
      line: this.config.WEAK_GIVER_LINE,
      minLowEffort: this.config.WEAK_GIVER_MIN_MARKS,
      minMarkers: this.config.WEAK_GIVER_MIN_MARKERS,
      harshShare: this.config.HARSH_MARKER_SHARE,
      harshMinMarks: this.config.HARSH_MARKER_MIN_MARKS,
      harshWeight: 0.5,
      flagMoreMarks: this.config.WEAK_GIVER_FLAG_MARKS,
    };
  }

  /** Holds after a new report: 3 different reporters, or one credible serious report. */
  private async reviewReports(subjectId: string, report: { reporterId: string; reason: ReportReason }): Promise<void> {
    const subject = await this.prisma.user.findUnique({ where: { id: subjectId }, select: { status: true } });
    if (!subject || subject.status !== 'active') return;
    const reporters = (await this.distinctReporters([subjectId])).get(subjectId) ?? 0;
    const serious = isSeriousReason(report.reason) && (await this.isCredibleReporter(report.reporterId));
    const reason = holdReason(reporters, serious, this.config.REPORT_HOLD_REPORTERS);
    if (reason) await this.openCase(subjectId, reason, true);
  }

  /** A serious report counts at once only from a verified account that is not itself on hold or banned. */
  private async isCredibleReporter(reporterId: string): Promise<boolean> {
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { status: true, profile: { select: { selfieStatus: true } } },
    });
    if (!reporter || reporter.status !== 'active' || reporter.profile?.selfieStatus !== 'verified') return false;
    return !(await this.isHeld(reporterId));
  }

  /**
   * Opens a review case unless one is already open. A serious report upgrades an open reporters hold,
   * so it moves to the top of the list.
   */
  private async openCase(userId: string, reason: 'reporters' | 'serious_report' | 'weak_giver', hides: boolean): Promise<void> {
    const open = await this.prisma.reviewCase.findMany({ where: { userId, closedAt: null }, select: { id: true, reason: true } });
    if (open.some((c) => c.reason === reason)) return;
    if (reason === 'reporters' && open.some((c) => c.reason === 'serious_report')) return;
    const reportersCase = open.find((c) => c.reason === 'reporters');
    if (reason === 'serious_report' && reportersCase) {
      await this.prisma.reviewCase.update({ where: { id: reportersCase.id }, data: { reason: 'serious_report', openedAt: new Date() } });
      return;
    }
    await this.prisma.reviewCase.create({ data: { userId, reason, hides } });
  }

  /** Owners who mark almost everything they receive as not helpful count for less. */
  private async harshMarkers(ownerIds: string[], since: Date): Promise<Set<string>> {
    if (ownerIds.length === 0) return new Set();
    const rows = await this.prisma.perspective.groupBy({
      by: ['ownerId', 'verdict'],
      where: { ownerId: { in: ownerIds }, verdict: { not: null }, feedbackAt: { gte: since } },
      _count: { _all: true },
    });
    const harsh = new Set<string>();
    for (const id of ownerIds) {
      const notHelpful = rows.find((r) => r.ownerId === id && r.verdict === 'not_helpful')?._count._all ?? 0;
      const helpful = rows.find((r) => r.ownerId === id && r.verdict === 'helpful')?._count._all ?? 0;
      if (isHarshMarker(notHelpful, notHelpful + helpful, this.qualityPolicy())) harsh.add(id);
    }
    return harsh;
  }
}

/** Returns temporary bans to active when they end, even for people who never open the app. */
@Injectable()
export class BanEndSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BanEndSweeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly enforcement: EnforcementService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const minutes = this.config.EXPIRY_SWEEP_MINUTES;
    if (minutes <= 0) return;
    this.timer = setInterval(() => void this.sweep(), minutes * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sweep(): Promise<void> {
    try {
      const lifted = await this.enforcement.liftEndedBans();
      if (lifted > 0) this.logger.log(`Lifted ${lifted} ended temporary ban(s)`);
    } catch (err) {
      this.logger.error('Ban-end sweep failed', err instanceof Error ? err.stack : String(err));
    }
  }
}

@Global()
@Module({ providers: [EnforcementService, BanEndSweeper], exports: [EnforcementService] })
export class EnforcementModule {}
