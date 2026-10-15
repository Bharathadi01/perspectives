import { Inject, Injectable } from '@nestjs/common';
import type {
  ConnectAttempt,
  Connection,
  ConnectRequestResult,
  Message,
  Relationship,
} from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { DailyService } from '../daily/daily.service';
import { ConnectState, cooldownUntil, evaluateConnect } from '../domain/connect';
import { isRevealed } from '../domain/daily';
import { TextModerator } from '../moderation/moderation';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { SocialService } from '../social/social.service';

function pair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

@Injectable()
export class ConnectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly daily: DailyService,
    private readonly mapper: ProfileMapper,
    private readonly moderator: TextModerator,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Gathers everything the connect rules need for viewer → receiver. */
  async state(viewerId: string, receiverId: string, now: Date = new Date()): Promise<ConnectState> {
    const [receiver, blocks, connection, outgoing, incoming, gate, declined, sentToday] = await Promise.all([
      this.social.person(receiverId),
      this.social.blockState(viewerId, receiverId),
      this.prisma.connection.findUnique({ where: { userAId_userBId: pair(viewerId, receiverId) } }),
      this.prisma.connectRequest.findFirst({ where: { senderId: viewerId, receiverId, status: 'pending' } }),
      this.prisma.connectRequest.findFirst({ where: { senderId: receiverId, receiverId: viewerId, status: 'pending' } }),
      this.prisma.perspective.findFirst({
        where: { giverId: viewerId, ownerId: receiverId, status: { not: 'removed' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
      this.prisma.connectRequest.findFirst({
        where: { senderId: viewerId, receiverId, status: 'declined' },
        orderBy: { respondedAt: 'desc' },
        select: { respondedAt: true },
      }),
      this.config.MAX_CONNECT_REQUESTS_PER_DAY === null
        ? Promise.resolve(0)
        : this.prisma.connectRequest.count({ where: { senderId: viewerId, receivedDayKey: this.daily.today(now) } }),
    ]);
    return {
      now,
      isSelf: viewerId === receiverId,
      receiverAvailable: receiver?.isLive ?? false,
      viewerBlockedReceiver: blocks.viewerBlocked,
      receiverBlockedViewer: blocks.blockedByOther,
      hasActiveConnection: connection?.status === 'active',
      hasPendingOutgoing: outgoing !== null,
      pendingIncomingId: incoming?.id ?? null,
      gatePerspectiveId: gate?.id ?? null,
      lastDeclinedAt: declined?.respondedAt ?? null,
      cooldownDays: this.config.CONNECT_DECLINE_COOLDOWN_DAYS,
      sentToday,
      dailyCap: this.config.MAX_CONNECT_REQUESTS_PER_DAY,
    };
  }

  async request(viewerId: string, receiverId: string, now: Date = new Date()): Promise<ConnectRequestResult> {
    const decision = evaluateConnect(await this.state(viewerId, receiverId, now));
    if (!decision.ok) {
      throw new AppException(decision.code, decision.message, decision.details);
    }
    const created = await this.prisma.connectRequest.create({
      data: {
        senderId: viewerId,
        receiverId,
        perspectiveId: decision.perspectiveId,
        receivedDayKey: this.daily.today(now),
      },
      select: { id: true, status: true },
    });
    return created;
  }

  /** Used when a giver ticks Connect while giving: never fails the perspective itself. */
  async tryRequest(viewerId: string, receiverId: string, now: Date = new Date()): Promise<ConnectAttempt> {
    try {
      const result = await this.request(viewerId, receiverId, now);
      return { status: 'sent', requestId: result.id };
    } catch (err) {
      if (err instanceof AppException) return { status: 'not_sent', code: err.code };
      throw err;
    }
  }

  async accept(viewerId: string, requestId: string): Promise<Connection> {
    const req = await this.pendingRequestFor(viewerId, requestId);
    const blocks = await this.social.blockState(viewerId, req.senderId);
    if (blocks.viewerBlocked || blocks.blockedByOther) {
      throw new AppException('BLOCKED_PAIR', 'This person is not available.');
    }
    const ids = pair(viewerId, req.senderId);
    const connection = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.connectRequest.updateMany({
        where: { id: req.id, status: 'pending' },
        data: { status: 'accepted', respondedAt: new Date() },
      });
      if (claimed.count === 0) throw new AppException('CONFLICT', 'This request was already answered.');
      await tx.connectRequest.updateMany({
        where: { senderId: viewerId, receiverId: req.senderId, status: 'pending' },
        data: { status: 'cancelled', respondedAt: new Date() },
      });
      return tx.connection.upsert({
        where: { userAId_userBId: ids },
        create: { ...ids, originRequestId: req.id },
        update: { status: 'active', originRequestId: req.id },
        select: { id: true },
      });
    });
    return this.connectionFor(viewerId, connection.id);
  }

  async decline(viewerId: string, requestId: string): Promise<ConnectRequestResult> {
    const req = await this.pendingRequestFor(viewerId, requestId);
    const updated = await this.prisma.connectRequest.updateMany({
      where: { id: req.id, status: 'pending' },
      data: { status: 'declined', respondedAt: new Date() },
    });
    if (updated.count === 0) throw new AppException('CONFLICT', 'This request was already answered.');
    return { id: req.id, status: 'declined' };
  }

  async connections(viewerId: string): Promise<Connection[]> {
    const rows = await this.prisma.connection.findMany({
      where: { status: 'active', OR: [{ userAId: viewerId }, { userBId: viewerId }] },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    const list = await Promise.all(rows.map((r) => this.connectionFor(viewerId, r.id)));
    return list.sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt));
  }

  async messages(viewerId: string, connectionId: string): Promise<Message[]> {
    await this.activeMembership(viewerId, connectionId);
    const rows = await this.prisma.message.findMany({
      where: { connectionId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    return rows.reverse().map((m) => ({
      id: m.id,
      connectionId: m.connectionId,
      senderId: m.senderId,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async send(viewerId: string, connectionId: string, text: string): Promise<Message> {
    const connection = await this.activeMembership(viewerId, connectionId);
    const partnerId = connection.userAId === viewerId ? connection.userBId : connection.userAId;
    const blocks = await this.social.blockState(viewerId, partnerId);
    if (blocks.viewerBlocked || blocks.blockedByOther) {
      throw new AppException('BLOCKED_PAIR', 'This conversation is closed.');
    }
    const verdict = await this.moderator.check(text);
    if (!verdict.allowed) {
      throw new AppException('MODERATION_FAILED', 'That message breaks the community guidelines.');
    }
    const m = await this.prisma.message.create({ data: { connectionId, senderId: viewerId, text } });
    await this.prisma.connection.update({ where: { id: connectionId }, data: { updatedAt: new Date() } });
    return { id: m.id, connectionId, senderId: viewerId, text: m.text, createdAt: m.createdAt.toISOString() };
  }

  async unmatch(viewerId: string, connectionId: string): Promise<void> {
    await this.activeMembership(viewerId, connectionId);
    await this.prisma.connection.update({ where: { id: connectionId }, data: { status: 'unmatched' } });
  }

  /** How the viewer relates to someone they are looking at (drives the profile screen). */
  async relationship(viewerId: string, targetId: string, now: Date = new Date()): Promise<Relationship> {
    const [state, gaveToThem, theyGaveToMe, latestUnlocked, incoming] = await Promise.all([
      this.state(viewerId, targetId, now),
      this.social.hasGivenTo(viewerId, targetId),
      this.social.hasGivenTo(targetId, viewerId),
      this.daily.latestUnlockedDay(viewerId),
      this.prisma.connectRequest.findFirst({
        where: { senderId: targetId, receiverId: viewerId, status: 'pending' },
        select: { id: true, receivedDayKey: true },
      }),
    ]);
    const connection = await this.prisma.connection.findUnique({
      where: { userAId_userBId: pair(viewerId, targetId) },
      select: { id: true, status: true },
    });
    return {
      gaveToThem,
      theyGaveToMe,
      connectionId: connection?.status === 'active' ? connection.id : null,
      outgoingRequestPending: state.hasPendingOutgoing,
      incomingRequestId: incoming && isRevealed(incoming.receivedDayKey, latestUnlocked) ? incoming.id : null,
      cooldownUntil: cooldownUntil(state.lastDeclinedAt, state.cooldownDays, now)?.toISOString() ?? null,
      canRequestConnect: evaluateConnect(state).ok,
    };
  }

  /** Cancels pending requests between two people (used by block). */
  async cancelPendingBetween(a: string, b: string): Promise<void> {
    await this.prisma.connectRequest.updateMany({
      where: {
        status: 'pending',
        OR: [
          { senderId: a, receiverId: b },
          { senderId: b, receiverId: a },
        ],
      },
      data: { status: 'cancelled', respondedAt: new Date() },
    });
  }

  private async pendingRequestFor(viewerId: string, requestId: string) {
    const req = await this.prisma.connectRequest.findUnique({ where: { id: requestId } });
    if (!req || req.receiverId !== viewerId) {
      throw new AppException('NOT_FOUND', 'This request is no longer available.');
    }
    if (req.status !== 'pending') {
      throw new AppException('CONFLICT', 'This request was already answered.');
    }
    const latest = await this.daily.latestUnlockedDay(viewerId);
    if (!isRevealed(req.receivedDayKey, latest)) {
      throw new AppException('DAILY_UNLOCK_INCOMPLETE', 'Finish today’s perspectives to see this request.');
    }
    return req;
  }

  private async activeMembership(viewerId: string, connectionId: string) {
    const connection = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection || (connection.userAId !== viewerId && connection.userBId !== viewerId)) {
      throw new AppException('NOT_FOUND', 'Conversation not found.');
    }
    if (connection.status !== 'active') {
      throw new AppException('FORBIDDEN', 'This conversation is closed.');
    }
    return connection;
  }

  private async connectionFor(viewerId: string, connectionId: string): Promise<Connection> {
    const c = await this.prisma.connection.findUniqueOrThrow({
      where: { id: connectionId },
      include: {
        userA: { include: PROFILE_USER_INCLUDE },
        userB: { include: PROFILE_USER_INCLUDE },
        originRequest: { include: { perspective: { include: { post: true } } } },
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
      },
    });
    const partner = c.userAId === viewerId ? c.userB : c.userA;
    const last = c.messages[0];
    return {
      id: c.id,
      partner: this.mapper.summary(partner),
      status: c.status,
      origin: {
        fromUserId: c.originRequest.senderId,
        comment: c.originRequest.perspective.comment,
        postPrompt: c.originRequest.perspective.post.prompt,
      },
      lastMessage: last ? { text: last.text, senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
