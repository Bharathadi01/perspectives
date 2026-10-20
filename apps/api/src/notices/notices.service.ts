import { Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Notice, Notices } from '@perspective/contracts';
import type { AgeRange } from '../domain/widening';
import { PrismaService } from '../prisma/prisma.service';

const LIST_LIMIT = 50;

/** The in-app notices list (decided 2026-10-20). Notices are private to their owner. */
@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.prisma.notice.createMany({
      data: [
        {
          userId,
          kind: 'audience_widened',
          dedupeKey: `audience_widened:${dayKey}`,
          data: { minAge: range.minAge, maxAge: range.maxAge, chosenMinAge: chosen.minAge, chosenMaxAge: chosen.maxAge },
        },
      ],
      skipDuplicates: true,
    });
  }

  private toDto(row: Prisma.NoticeGetPayload<object>): Notice {
    const data = row.data as Record<string, number>;
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
      read: row.readAt !== null,
      minAge: data.minAge,
      maxAge: data.maxAge,
      chosenMinAge: data.chosenMinAge,
      chosenMaxAge: data.chosenMaxAge,
    };
  }
}

@Global()
@Module({ providers: [NoticesService], exports: [NoticesService] })
export class NoticesServiceModule {}
