import { Injectable } from '@nestjs/common';
import { CreateReportInput, DeleteAccountInput } from '@perspective/contracts';
import { AuthService } from '../auth/auth.service';
import { AppException } from '../common/app-exception';
import { ConnectService } from '../connect/connect.service';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly connect: ConnectService,
    private readonly media: MediaService,
    private readonly auth: AuthService,
  ) {}

  async report(reporterId: string, input: CreateReportInput): Promise<{ reportId: string }> {
    const report = await this.prisma.report.create({
      data: { reporterId, targetType: input.targetType, targetId: input.targetId, reason: input.reason, note: input.note },
      select: { id: true },
    });
    return { reportId: report.id };
  }

  /**
   * Blocking is immediate and bidirectional: pending requests are cancelled, any connection is
   * closed. Today's Explore slots with that person are re-validated and replaced on the next
   * Explore load (DailyService.nextPendingSlot).
   */
  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId || !(await this.social.person(blockedId))) {
      throw new AppException('NOT_FOUND', 'Person not found.');
    }
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    await this.connect.cancelPendingBetween(blockerId, blockedId);
    const [userAId, userBId] = blockerId < blockedId ? [blockerId, blockedId] : [blockedId, blockerId];
    await this.prisma.connection.updateMany({ where: { userAId, userBId }, data: { status: 'blocked' } });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
  }

  /**
   * In-app account deletion (needs the password again). Hides the account at once by deleting it;
   * product records and media go with it. Reports the user filed are kept without the link to them.
   */
  async deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
    if (!(await this.auth.verifyUserPassword(userId, input.password))) {
      throw new AppException('INVALID_CREDENTIALS', 'Password is incorrect.');
    }
    const job = await this.prisma.deletionJob.create({ data: {}, select: { id: true } });
    try {
      await this.media.removeAllFilesFor(userId);
      await this.prisma.user.delete({ where: { id: userId } });
      await this.prisma.deletionJob.update({ where: { id: job.id }, data: { status: 'completed', completedAt: new Date() } });
    } catch (err) {
      await this.prisma.deletionJob.update({ where: { id: job.id }, data: { status: 'failed' } });
      throw err;
    }
  }
}
