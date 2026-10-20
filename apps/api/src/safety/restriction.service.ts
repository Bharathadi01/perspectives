import { Injectable } from '@nestjs/common';
import { Restriction } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { isRestricted } from '../domain/enforcement';
import { PrismaService } from '../prisma/prisma.service';

/**
 * What a suspended or banned person sees, and their one appeal per ban (decided 2026-10-20 and
 * 2026-10-21). Their profile is hidden and chats are paused; they can still delete their account.
 */
@Injectable()
export class RestrictionService {
  constructor(private readonly prisma: PrismaService) {}

  async restriction(userId: string, now: Date = new Date()): Promise<Restriction> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { status: true, suspendedUntil: true } });
    if (!isRestricted(user.status, user.suspendedUntil, now) || user.status === 'active') {
      throw new AppException('NOT_FOUND', 'Your account is not restricted.');
    }
    const ban = await this.currentBan(userId);
    return {
      status: user.status,
      reason: ban?.reason ?? 'Your account is restricted.',
      endsAt: user.status === 'suspended' && user.suspendedUntil ? user.suspendedUntil.toISOString() : null,
      appeal: ban?.appeal
        ? {
            status: ban.appeal.status,
            message: ban.appeal.message,
            createdAt: ban.appeal.createdAt.toISOString(),
            decisionReason: ban.appeal.decisionReason,
          }
        : null,
      canAppeal: !!ban && !ban.appeal,
    };
  }

  async appeal(userId: string, message: string, now: Date = new Date()): Promise<Restriction> {
    await this.restriction(userId, now);
    const ban = await this.currentBan(userId);
    if (!ban || ban.appeal) {
      throw new AppException('APPEAL_NOT_ALLOWED', 'You have already appealed this decision.');
    }
    await this.prisma.appeal.create({ data: { banId: ban.id, userId, message } });
    return this.restriction(userId, now);
  }

  private currentBan(userId: string) {
    return this.prisma.ban.findFirst({
      where: { userId, liftedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { appeal: true },
    });
  }
}
