import { Global, Injectable, Module } from '@nestjs/common';
import { NoticeKind, Prisma } from '@prisma/client';
import { Notice, Notices } from '@perspective/contracts';
import type { AgeRange } from '../domain/widening';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const LIST_LIMIT = 50;

/** The in-app notices list (decided 2026-10-20). Notices are private to their owner. */
@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async list(userId: string): Promise<Notices> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: LIST_LIMIT }),
      this.prisma.notice.count({ where: { userId, readAt: null } }),
    ]);
    return { notices: rows.map((r) => this.toDto(r)), unreadCount };
  }

  async markAllRead(userId: string, now: Date = new Date()): Promise<void> {
    await this.prisma.notice.updateMany({ where: { userId, readAt: null }, data: { readAt: now } });
  }

  /** Tells the person their age range was widened automatically. Written at most once a day. */
  async audienceWidened(userId: string, dayKey: string, range: AgeRange, chosen: AgeRange): Promise<void> {
    await this.create(
      userId,
      'audience_widened',
      { minAge: range.minAge, maxAge: range.maxAge, chosenMinAge: chosen.minAge, chosenMaxAge: chosen.maxAge },
      `audience_widened:${dayKey}`,
    );
  }

  /** Writes a notice once per `dedupeKey`. */
  async create(userId: string, kind: NoticeKind, data: Prisma.InputJsonObject, dedupeKey: string): Promise<void> {
    const created = await this.prisma.notice.createMany({ data: [{ userId, kind, dedupeKey, data }], skipDuplicates: true });
    // Push G (placeholder): the notice itself stays in the app; the push only says there is one.
    if (created.count > 0) {
      this.push.notify(userId, { title: 'Perspective', body: 'You have a new notice.', data: { screen: 'notices' }, account: true });
    }
  }

  private toDto(row: Prisma.NoticeGetPayload<object>): Notice {
    const base = { id: row.id, createdAt: row.createdAt.toISOString(), read: row.readAt !== null };
    const data = (row.data ?? {}) as Record<string, unknown>;
    switch (row.kind) {
      case 'audience_widened':
        return {
          ...base,
          kind: 'audience_widened',
          minAge: Number(data.minAge),
          maxAge: Number(data.maxAge),
          chosenMinAge: Number(data.chosenMinAge),
          chosenMaxAge: Number(data.chosenMaxAge),
        };
      case 'weak_giver_tip':
        return { ...base, kind: 'weak_giver_tip' };
      case 'account_restored':
        return { ...base, kind: 'account_restored', reason: String(data.reason ?? '') };
    }
  }
}

@Global()
@Module({ providers: [NoticesService], exports: [NoticesService] })
export class NoticesServiceModule {}
