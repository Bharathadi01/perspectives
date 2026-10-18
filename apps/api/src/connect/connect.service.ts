import { Inject, Injectable } from '@nestjs/common';
import type {
  ConnectAttempt,
  Connection,
  ConnectRequestResult,
  Message,
  Relationship,
} from '@perspective/contracts';
import type { Connection as ConnectionRow } from '@prisma/client';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { DailyService } from '../daily/daily.service';
import { ConnectState, evaluateAccept, evaluateConnect, requestAvailableAt } from '../domain/connect';
import { ExpiryConfig, ExpiryDecision, ExpiryFacts, evaluateExpiry, expiryForViewer } from '../domain/connection-expiry';
import { isRevealed } from '../domain/daily';
import { TextModerator } from '../moderation/moderation';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { SocialService } from '../social/social.service';

function pair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/** The viewer's own "seen the connected moment" column. */
function seenField(c: Pick<ConnectionRow, 'userAId'>, viewerId: string): 'userASeenAt' | 'userBSeenAt' {
  return c.userAId === viewerId ? 'userASeenAt' : 'userBSeenAt';
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
    const existing = await this.prisma.connection.findUnique({ where: { userAId_userBId: pair(viewerId, receiverId) } });
    // A quiet connection that is overdue is closed first, so it does not block a new request.
    const connection = existing ? (await this.refreshExpiry(existing, now)).connection : null;
    const [receiver, blocks, outgoing, incoming, gate, declined, sentToday] = await Promise.all([
      this.social.person(receiverId),
      this.social.blockState(viewerId, receiverId),
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
      lastAutoClosedAt: connection?.closedReason ? connection.closedAt : null,
      reopenCooldownDays: this.config.REOPEN_COOLDOWN_DAYS,
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

  /**
   * Used when someone ticks Connect while giving a perspective. If the other person already has a
   * request waiting for them, the perspective they just gave is the "give back", so accept it;
   * otherwise ask to connect. Never fails the perspective itself.
   */
  async tryConnect(viewerId: string, otherId: string, now: Date = new Date()): Promise<ConnectAttempt> {
    const incoming = await this.prisma.connectRequest.findFirst({
      where: { senderId: otherId, receiverId: viewerId, status: 'pending' },
      select: { id: true },
    });
    if (!incoming) return this.tryRequest(viewerId, otherId, now);
    try {
      const connection = await this.accept(viewerId, incoming.id);
      return { status: 'connected', connectionId: connection.id };
    } catch (err) {
      if (err instanceof AppException) return { status: 'not_sent', code: err.code };
      throw err;
    }
  }

  /**
   * Accepting creates (or re-opens) the connection. The person accepting sees the connected moment
   * right away, so their side is marked seen; the person who asked sees it next time they are around.
   */
  async accept(viewerId: string, requestId: string): Promise<Connection> {
    const req = await this.pendingRequestFor(viewerId, requestId);
    const blocks = await this.social.blockState(viewerId, req.senderId);
    if (blocks.viewerBlocked || blocks.blockedByOther) {
      throw new AppException('BLOCKED_PAIR', 'This person is not available.');
    }
    const gate = evaluateAccept({ receiverGaveToSender: await this.social.hasGivenTo(viewerId, req.senderId) });
    if (!gate.ok) throw new AppException(gate.code, gate.message, { senderId: req.senderId });
    const ids = pair(viewerId, req.senderId);
    const now = new Date();
    const fresh = {
      connectedAt: now,
      userASeenAt: ids.userAId === viewerId ? now : null,
      userBSeenAt: ids.userBId === viewerId ? now : null,
      firstReplySeenAt: null,
      closedReason: null,
      closedAt: null,
    };
    const connection = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.connectRequest.updateMany({
        where: { id: req.id, status: 'pending' },
        data: { status: 'accepted', respondedAt: now },
      });
      if (claimed.count === 0) throw new AppException('CONFLICT', 'This request was already answered.');
      await tx.connectRequest.updateMany({
        where: { senderId: viewerId, receiverId: req.senderId, status: 'pending' },
        data: { status: 'cancelled', respondedAt: now },
      });
      return tx.connection.upsert({
        where: { userAId_userBId: ids },
        create: { ...ids, originRequestId: req.id, ...fresh },
        update: { status: 'active', originRequestId: req.id, ...fresh },
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

  /** Active connections, newest activity first. Quiet ones that are overdue close on the way. */
  async connections(viewerId: string, now: Date = new Date()): Promise<Connection[]> {
    const rows = await this.activeRowsFor(viewerId, now);
    const list = await Promise.all(rows.map((r) => this.connectionFor(viewerId, r.id, now)));
    return list.sort((a, b) => (b.lastMessage?.createdAt ?? b.connectedAt).localeCompare(a.lastMessage?.createdAt ?? a.connectedAt));
  }

  /** Connections the viewer has not yet seen the "you're connected" moment for. */
  async unseen(viewerId: string, now: Date = new Date()): Promise<Connection[]> {
    const rows = await this.activeRowsFor(viewerId, now);
    const fresh = rows.filter((r) => r[seenField(r, viewerId)] === null);
    const list = await Promise.all(fresh.map((r) => this.connectionFor(viewerId, r.id, now)));
    return list.sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
  }

  /** Marks the connected moment as seen. Only touches the viewer's own side; repeating it is harmless. */
  async markSeen(viewerId: string, connectionIds: readonly string[], now: Date = new Date()): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.connection.updateMany({
        where: { id: { in: [...connectionIds] }, userAId: viewerId, userASeenAt: null },
        data: { userASeenAt: now },
      }),
      this.prisma.connection.updateMany({
        where: { id: { in: [...connectionIds] }, userBId: viewerId, userBSeenAt: null },
        data: { userBSeenAt: now },
      }),
    ]);
  }

  /**
   * Opening a chat (this GET) is the "seen" signal: it marks the connected moment as seen and, if the
   * viewer owes the first reply, starts the first-reply clock. The other person is never told.
   */
  async messages(viewerId: string, connectionId: string, now: Date = new Date()): Promise<Message[]> {
    const { connection, decision } = await this.activeMembership(viewerId, connectionId, now);
    const updates: Partial<Pick<ConnectionRow, 'userASeenAt' | 'userBSeenAt' | 'firstReplySeenAt'>> = {};
    const seen = seenField(connection, viewerId);
    if (connection[seen] === null) updates[seen] = now;
    if (decision.phase === 'awaiting_reply' && decision.quietUserId === viewerId && connection.firstReplySeenAt === null) {
      updates.firstReplySeenAt = now;
    }
    if (Object.keys(updates).length > 0) {
      await this.prisma.connection.update({ where: { id: connectionId }, data: updates });
    }
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
    const { connection } = await this.activeMembership(viewerId, connectionId);
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
      cooldownUntil: requestAvailableAt(state)?.toISOString() ?? null,
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

  /** Closes quiet connections that are overdue, for people who are not opening the app. Returns how many closed. */
  async sweepQuietConnections(now: Date = new Date(), batch = 500): Promise<number> {
    const rows = await this.prisma.connection.findMany({
      where: { status: 'active' },
      orderBy: { updatedAt: 'asc' },
      take: batch,
    });
    let closed = 0;
    for (const row of rows) {
      if ((await this.refreshExpiry(row, now)).decision.close) closed++;
    }
    return closed;
  }

  private expiryConfig(): ExpiryConfig {
    return {
      firstReplyWarnHours: this.config.FIRST_REPLY_WARN_HOURS,
      firstReplyCloseHours: this.config.FIRST_REPLY_CLOSE_HOURS,
      firstReplyBackstopDays: this.config.FIRST_REPLY_BACKSTOP_DAYS,
      noMessageRemindDays: this.config.NO_MESSAGE_REMIND_DAYS,
      noMessageCloseDays: this.config.NO_MESSAGE_CLOSE_DAYS,
      inactivityCloseDays: this.config.INACTIVITY_CLOSE_DAYS,
    };
  }

  /** Facts for the quiet-connection rule. Only messages since the pair (re)connected count. */
  private async expiryFacts(c: ConnectionRow, now: Date): Promise<ExpiryFacts> {
    const since = { connectionId: c.id, createdAt: { gte: c.connectedAt } };
    const [first, last] = await Promise.all([
      this.prisma.message.findFirst({ where: since, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { senderId: true, createdAt: true } }),
      this.prisma.message.findFirst({ where: since, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { createdAt: true } }),
    ]);
    const partnerReplied = first
      ? (await this.prisma.message.findFirst({ where: { ...since, senderId: { not: first.senderId } }, select: { id: true } })) !== null
      : false;
    return {
      now,
      connectedAt: c.connectedAt,
      firstMessage: first ? { senderId: first.senderId, at: first.createdAt } : null,
      partnerReplied,
      lastMessageAt: last?.createdAt ?? null,
      firstReplySeenAt: c.firstReplySeenAt,
    };
  }

  /** Evaluates the quiet-connection rule and closes the connection when it is due. */
  private async refreshExpiry(c: ConnectionRow, now: Date = new Date()): Promise<{ connection: ConnectionRow; decision: ExpiryDecision }> {
    if (c.status !== 'active') {
      return { connection: c, decision: { phase: 'established', close: null, warn: false, quietUserId: null, closesAt: null } };
    }
    const partnerOf = (id: string) => (id === c.userAId ? c.userBId : c.userAId);
    const decision = evaluateExpiry(await this.expiryFacts(c, now), partnerOf, this.expiryConfig());
    if (!decision.close) return { connection: c, decision };
    const closed = await this.prisma.connection.updateMany({
      where: { id: c.id, status: 'active' },
      data: { status: 'unmatched', closedReason: decision.close, closedAt: now },
    });
    const connection = closed.count > 0
      ? { ...c, status: 'unmatched' as const, closedReason: decision.close, closedAt: now }
      : await this.prisma.connection.findUniqueOrThrow({ where: { id: c.id } });
    return { connection, decision };
  }

  private async activeRowsFor(viewerId: string, now: Date): Promise<ConnectionRow[]> {
    const rows = await this.prisma.connection.findMany({
      where: { status: 'active', OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    });
    const refreshed = await Promise.all(rows.map((r) => this.refreshExpiry(r, now)));
    return refreshed.filter((r) => r.connection.status === 'active').map((r) => r.connection);
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

  private async activeMembership(
    viewerId: string,
    connectionId: string,
    now: Date = new Date(),
  ): Promise<{ connection: ConnectionRow; decision: ExpiryDecision }> {
    const found = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!found || (found.userAId !== viewerId && found.userBId !== viewerId)) {
      throw new AppException('NOT_FOUND', 'Conversation not found.');
    }
    const { connection, decision } = await this.refreshExpiry(found, now);
    if (connection.status !== 'active') {
      if (connection.closedReason) {
        throw new AppException('CONNECTION_CLOSED', 'This connection closed because the conversation went quiet.', {
          reason: connection.closedReason,
        });
      }
      throw new AppException('FORBIDDEN', 'This conversation is closed.');
    }
    return { connection, decision };
  }

  private async connectionFor(viewerId: string, connectionId: string, now: Date = new Date()): Promise<Connection> {
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
    const askerId = c.originRequest.senderId;
    const answererId = askerId === c.userAId ? c.userBId : c.userAId;
    const reply = await this.prisma.perspective.findFirst({
      where: { giverId: answererId, ownerId: askerId, status: { not: 'removed' } },
      orderBy: { createdAt: 'desc' },
      include: { post: true },
    });
    const decision =
      c.status === 'active'
        ? evaluateExpiry(await this.expiryFacts(c, now), (id) => (id === c.userAId ? c.userBId : c.userAId), this.expiryConfig())
        : null;
    return {
      id: c.id,
      partner: this.mapper.summary(partner),
      status: c.status,
      origin: {
        fromUserId: c.originRequest.senderId,
        comment: c.originRequest.perspective.comment,
        postPrompt: c.originRequest.perspective.post.prompt,
        postCategory: c.originRequest.perspective.post.category,
      },
      reply: reply ? { fromUserId: answererId, comment: reply.comment, postPrompt: reply.post.prompt } : null,
      lastMessage: last ? { text: last.text, senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
      createdAt: c.createdAt.toISOString(),
      connectedAt: c.connectedAt.toISOString(),
      isNew: c[seenField(c, viewerId)] === null,
      expiry: decision ? expiryForViewer(decision, viewerId) : { state: 'ok', closesAt: null },
      closedReason: c.closedReason,
    };
  }
}
