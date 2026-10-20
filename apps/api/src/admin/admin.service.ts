import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminAction, AdminCase, AdminQueueItem, AdminQueueReason, AdminReport, ageFromBirthDate } from '@perspective/contracts';
import { createHash } from 'node:crypto';
import { AppException } from '../common/app-exception';
import { isoDate } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { banEndsAt, extendedEnd, isRestricted } from '../domain/enforcement';
import { EnforcementService } from '../enforcement/enforcement.service';
import { NoticesService } from '../notices/notices.service';
import { PrismaService } from '../prisma/prisma.service';
import { POST_INCLUDE, PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';

const QUEUE_ORDER: Record<AdminQueueReason, number> = { serious_report: 0, appeal: 1, reporters: 2, weak_giver: 3 };

/**
 * The admin review list and decisions (docs/SECURITY.md → Admin access and enforcement,
 * docs/PRODUCT.md → Reports, holds and bans). Every action needs a reason and is written to the audit
 * log, as is every view of reported content.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enforcement: EnforcementService,
    private readonly notices: NoticesService,
    private readonly mapper: ProfileMapper,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Everyone on hold or flagged, plus open appeals: serious reports first, then appeals, then the rest. */
  async queue(): Promise<AdminQueueItem[]> {
    const [cases, appeals] = await Promise.all([
      this.prisma.reviewCase.findMany({ where: { closedAt: null }, select: { userId: true, reason: true, hides: true, openedAt: true } }),
      this.prisma.appeal.findMany({ where: { status: 'open' }, select: { userId: true, createdAt: true } }),
    ]);
    const userIds = [...new Set([...cases.map((c) => c.userId), ...appeals.map((a) => a.userId)])];
    const [users, reporters] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, status: true, profile: { select: { displayName: true } } } }),
      this.enforcement.distinctReporters(userIds),
    ]);
    const userBy = new Map(users.map((u) => [u.id, u]));
    const heldIds = new Set(cases.filter((c) => c.hides).map((c) => c.userId));
    const item = (userId: string, reason: AdminQueueReason, since: Date): AdminQueueItem | null => {
      const u = userBy.get(userId);
      if (!u) return null;
      return {
        userId,
        displayName: u.profile?.displayName ?? 'Member',
        reason,
        status: u.status,
        hidden: heldIds.has(userId),
        since: since.toISOString(),
        distinctReporters: reporters.get(userId) ?? 0,
      };
    };
    const items = [
      ...cases.map((c) => item(c.userId, c.reason, c.openedAt)),
      ...appeals.map((a) => item(a.userId, 'appeal', a.createdAt)),
    ].filter((i): i is AdminQueueItem => i !== null);
    return items.sort((a, b) => QUEUE_ORDER[a.reason] - QUEUE_ORDER[b.reason] || b.since.localeCompare(a.since));
  }

  /** Everything an admin needs to decide, including the reported content. The view is audit-logged. */
  async case(adminId: string, userId: string): Promise<AdminCase> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: PROFILE_USER_INCLUDE });
    if (!user) throw new AppException('NOT_FOUND', 'Person not found.');
    const [openCases, reports, quality, bans, history, reporters] = await Promise.all([
      this.prisma.reviewCase.findMany({ where: { userId, closedAt: null }, orderBy: { openedAt: 'desc' } }),
      this.prisma.report.findMany({ where: { subjectId: userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.giverQuality.findUnique({ where: { userId } }),
      this.prisma.ban.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { appeal: true } }),
      this.prisma.adminAuditEntry.findMany({
        where: { targetUserId: userId, action: { not: 'view_case' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { admin: { select: { email: true } } },
      }),
      this.enforcement.distinctReporters([userId]),
    ]);
    await this.audit(adminId, 'view_case', userId, null);
    const primary = user.posts.find((p) => p.kind === 'photo');
    return {
      person: {
        id: user.id,
        displayName: user.profile?.displayName ?? 'Member',
        email: user.email,
        age: ageFromBirthDate(isoDate(user.birthDate)),
        status: user.status,
        suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
        joinedAt: user.createdAt.toISOString(),
        primaryPhotoUrl: primary ? (this.mapper.post(primary).mediaUrl ?? null) : null,
      },
      openCases: openCases.map((c) => ({ id: c.id, reason: c.reason, hides: c.hides, openedAt: c.openedAt.toISOString() })),
      distinctReporters: reporters.get(userId) ?? 0,
      reports: await this.reportsWithContent(reports),
      quality: {
        weak: quality?.weak ?? false,
        lowEffortMarks: quality?.lowEffortMarks ?? 0,
        helpfulMarks: quality?.helpfulMarks ?? 0,
        weakSince: quality?.weakSince?.toISOString() ?? null,
        flagged: !!quality?.flaggedAt,
      },
      bans: bans.map((b) => ({
        id: b.id,
        kind: b.kind,
        reason: b.reason,
        createdAt: b.createdAt.toISOString(),
        endsAt: b.endsAt?.toISOString() ?? null,
        liftedAt: b.liftedAt?.toISOString() ?? null,
        appeal: b.appeal
          ? {
              id: b.appeal.id,
              status: b.appeal.status,
              message: b.appeal.message,
              createdAt: b.appeal.createdAt.toISOString(),
              decisionReason: b.appeal.decisionReason,
            }
          : null,
      })),
      history: history.map((h) => ({ action: h.action, admin: h.admin.email, reason: h.reason, createdAt: h.createdAt.toISOString() })),
    };
  }

  async act(adminId: string, userId: string, action: AdminAction, reason: string, now: Date = new Date()): Promise<AdminCase> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true, suspendedUntil: true } });
    if (!user) throw new AppException('NOT_FOUND', 'Person not found.');
    switch (action) {
      case 'dismiss':
        await this.dismiss(userId, now);
        break;
      case 'ban_temporary':
        if (user.status !== 'active') throw new AppException('CONFLICT', 'This person is already banned.');
        await this.ban(adminId, userId, 'temporary', reason, banEndsAt(now, this.config.BAN_TEMPORARY_DAYS), now);
        break;
      case 'ban_permanent':
        if (user.status === 'banned') throw new AppException('CONFLICT', 'This person is already banned permanently.');
        await this.ban(adminId, userId, 'permanent', reason, null, now);
        await this.prisma.blockedEmail.upsert({ where: { email: user.email }, create: { email: user.email }, update: {} });
        break;
      case 'extend':
        if (user.status !== 'suspended') throw new AppException('CONFLICT', 'Only a temporary ban can be extended.');
        await this.extend(adminId, userId, reason, extendedEnd(user.suspendedUntil, now, this.config.BAN_TEMPORARY_DAYS), now);
        break;
      case 'restore':
        if (!isRestricted(user.status, user.suspendedUntil, now)) throw new AppException('CONFLICT', 'This person is not banned.');
        await this.restore(adminId, userId, reason, user.email, now);
        break;
    }
    await this.audit(adminId, action, userId, reason);
    return this.case(adminId, userId);
  }

  /** Keep the ban (the appeal is closed and this ban cannot be appealed again) or lift it. */
  async decideAppeal(adminId: string, appealId: string, decision: 'uphold' | 'restore', reason: string, now: Date = new Date()): Promise<AdminCase> {
    const appeal = await this.prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) throw new AppException('NOT_FOUND', 'Appeal not found.');
    if (appeal.status !== 'open') throw new AppException('CONFLICT', 'This appeal was already decided.');
    if (decision === 'uphold') {
      await this.prisma.appeal.update({
        where: { id: appealId },
        data: { status: 'upheld', decidedAt: now, decidedBy: adminId, decisionReason: reason },
      });
      await this.audit(adminId, 'appeal_upheld', appeal.userId, reason, appealId);
      return this.case(adminId, appeal.userId);
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: appeal.userId }, select: { email: true } });
    await this.restore(adminId, appeal.userId, reason, user.email, now);
    await this.audit(adminId, 'appeal_restored', appeal.userId, reason, appealId);
    return this.case(adminId, appeal.userId);
  }

  /** The hold is lifted and the reports reviewed so far stop counting; a weak giver needs 10 new marks to be flagged again. */
  private async dismiss(userId: string, now: Date): Promise<void> {
    const open = await this.prisma.reviewCase.findMany({ where: { userId, closedAt: null }, select: { reason: true } });
    if (open.length === 0) throw new AppException('CONFLICT', 'Nothing is waiting for a decision.');
    await this.prisma.$transaction([
      this.prisma.reviewCase.updateMany({ where: { userId, closedAt: null }, data: { closedAt: now, outcome: 'dismissed' } }),
      this.prisma.report.updateMany({ where: { subjectId: userId, status: { in: ['unreviewed', 'human_review'] } }, data: { status: 'allowed' } }),
    ]);
    if (open.some((c) => c.reason === 'weak_giver')) {
      await this.prisma.giverQuality.updateMany({ where: { userId, weak: true }, data: { weakSince: now, flaggedAt: null } });
    }
  }

  private async ban(adminId: string, userId: string, kind: 'temporary' | 'permanent', reason: string, endsAt: Date | null, now: Date): Promise<void> {
    const outcome = kind === 'temporary' ? 'banned_temporary' : 'banned_permanent';
    await this.prisma.$transaction([
      // A permanent ban replaces a temporary one in force.
      this.prisma.ban.updateMany({ where: { userId, liftedAt: null }, data: { liftedAt: now } }),
      this.prisma.ban.create({ data: { userId, kind, reason, endsAt, createdBy: adminId } }),
      this.prisma.user.update({ where: { id: userId }, data: { status: kind === 'temporary' ? 'suspended' : 'banned', suspendedUntil: endsAt } }),
      this.prisma.reviewCase.updateMany({ where: { userId, closedAt: null }, data: { closedAt: now, outcome } }),
      this.prisma.report.updateMany({ where: { subjectId: userId, status: { in: ['unreviewed', 'human_review'] } }, data: { status: 'removed' } }),
    ]);
  }

  /** Extending is a new decision with a new end, so it can be appealed once again (decided 2026-10-21). */
  private async extend(adminId: string, userId: string, reason: string, endsAt: Date, now: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.ban.updateMany({ where: { userId, liftedAt: null }, data: { liftedAt: now } }),
      this.prisma.ban.create({ data: { userId, kind: 'temporary', reason, endsAt, createdBy: adminId } }),
      this.prisma.user.update({ where: { id: userId }, data: { suspendedUntil: endsAt } }),
    ]);
  }

  private async restore(adminId: string, userId: string, reason: string, email: string, now: Date): Promise<void> {
    const current = await this.prisma.ban.findFirst({ where: { userId, liftedAt: null }, orderBy: { createdAt: 'desc' }, include: { appeal: true } });
    const steps: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.ban.updateMany({ where: { userId, liftedAt: null }, data: { liftedAt: now } }),
      this.prisma.user.update({ where: { id: userId }, data: { status: 'active', suspendedUntil: null } }),
      this.prisma.blockedEmail.deleteMany({ where: { email } }),
    ];
    if (current?.appeal?.status === 'open') {
      steps.push(
        this.prisma.appeal.update({
          where: { id: current.appeal.id },
          data: { status: 'restored', decidedAt: now, decidedBy: adminId, decisionReason: reason },
        }),
      );
    }
    await this.prisma.$transaction(steps);
    await this.notices.create(userId, 'account_restored', { reason }, `account_restored:${now.toISOString()}`);
  }

  private async audit(adminId: string, action: string, targetUserId: string | null, reason: string | null, targetId?: string): Promise<void> {
    await this.prisma.adminAuditEntry.create({ data: { adminId, action, targetUserId, reason, targetId: targetId ?? null } });
  }

  /** Each report with the content it is about. Reporters show only as a stable label, never their identity. */
  private async reportsWithContent(
    reports: { id: string; reason: AdminReport['reason']; note: string | null; targetType: AdminReport['targetType']; targetId: string; reporterId: string | null; status: AdminReport['status']; fromFeedback: boolean; createdAt: Date }[],
  ): Promise<AdminReport[]> {
    const ids = (type: string) => reports.filter((r) => r.targetType === type).map((r) => r.targetId);
    const [posts, perspectives, messages] = await Promise.all([
      this.prisma.post.findMany({ where: { id: { in: ids('post') } }, include: POST_INCLUDE }),
      this.prisma.perspective.findMany({ where: { id: { in: ids('perspective') } }, select: { id: true, comment: true } }),
      this.prisma.message.findMany({ where: { id: { in: ids('message') } }, select: { id: true, text: true } }),
    ]);
    return reports.map((r) => {
      let content: AdminReport['content'] = { text: null, prompt: null, mediaUrl: null, missing: false };
      if (r.targetType === 'post') {
        const post = posts.find((p) => p.id === r.targetId);
        const dto = post ? this.mapper.post(post) : null;
        content = dto
          ? { text: null, prompt: dto.prompt, mediaUrl: dto.mediaUrl ?? dto.audioMediaUrl ?? null, missing: false }
          : { ...content, missing: true };
      } else if (r.targetType === 'perspective') {
        const p = perspectives.find((x) => x.id === r.targetId);
        content = p ? { ...content, text: p.comment } : { ...content, missing: true };
      } else if (r.targetType === 'message') {
        const m = messages.find((x) => x.id === r.targetId);
        content = m ? { ...content, text: m.text } : { ...content, missing: true };
      }
      return {
        id: r.id,
        reason: r.reason,
        note: r.note,
        targetType: r.targetType,
        fromFeedback: r.fromFeedback,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporterLabel: r.reporterId ? `R-${createHash('sha256').update(r.reporterId).digest('hex').slice(0, 6)}` : 'deleted account',
        content,
      };
    });
  }
}
