import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GivenPerspective,
  GivePerspectiveParsed,
  GivePerspectiveResult,
  Inbox,
  InboxGroup,
  PerspectiveFeedback,
  PerspectiveFeedbackInput,
  PerspectiveFeedbackInputSchema,
  ReceivedPerspective,
  chipsFor,
} from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { ConnectService } from '../connect/connect.service';
import { CandidatesService } from '../daily/candidates.service';
import { DailyService } from '../daily/daily.service';
import { isRevealed } from '../domain/daily';
import { mutuallyVisible } from '../domain/eligibility';
import { TextModerator } from '../moderation/moderation';
import { PrismaService } from '../prisma/prisma.service';
import { POST_INCLUDE, PROFILE_USER_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { SocialService } from '../social/social.service';

const RECEIVED_INCLUDE = {
  post: { include: POST_INCLUDE },
  giver: { include: PROFILE_USER_INCLUDE },
} as const;
type ReceivedRow = Prisma.PerspectiveGetPayload<{ include: typeof RECEIVED_INCLUDE }>;

@Injectable()
export class PerspectivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly daily: DailyService,
    private readonly candidates: CandidatesService,
    private readonly social: SocialService,
    private readonly connect: ConnectService,
    private readonly mapper: ProfileMapper,
    private readonly moderator: TextModerator,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Give a text-only perspective on one post. Rules: not your own post, the owner is live and
   * not blocked, you are inside each other's audience (or they already gave you a perspective,
   * for the owner-initiated give-back), one perspective per post, moderation before delivery.
   */
  async give(viewerId: string, input: GivePerspectiveParsed, now: Date = new Date()): Promise<GivePerspectiveResult> {
    const post = await this.prisma.post.findUnique({ where: { id: input.postId }, include: POST_INCLUDE });
    if (!post || post.status !== 'active') {
      throw new AppException('POST_NOT_ELIGIBLE', 'This post is no longer available.');
    }
    if (post.ownerId === viewerId) {
      throw new AppException('POST_NOT_ELIGIBLE', 'You cannot give a perspective on your own post.');
    }
    const [viewer, owner, blocks] = await Promise.all([
      this.social.person(viewerId),
      this.social.person(post.ownerId),
      this.social.blockState(viewerId, post.ownerId),
    ]);
    if (!viewer || !owner || !owner.isLive || blocks.blockedByOther) {
      throw new AppException('POST_NOT_ELIGIBLE', 'This post is no longer available.');
    }
    if (blocks.viewerBlocked) {
      throw new AppException('BLOCKED_PAIR', 'You blocked this person.');
    }
    if (!mutuallyVisible(viewer, owner) && !(await this.social.hasGivenTo(owner.id, viewerId))) {
      throw new AppException('POST_NOT_ELIGIBLE', 'This post is not available to you.');
    }
    const allowedChips = chipsFor(post.category);
    if (!input.chips.every((c) => allowedChips.includes(c))) {
      throw new AppException('VALIDATION_FAILED', 'Pick chips from the list for this post.');
    }
    if ((await this.candidates.cappedToday([owner.id], now)).has(owner.id)) {
      throw new AppException('CAP_REACHED', 'This profile has received enough perspectives today.');
    }
    const verdict = await this.moderator.check(input.comment);
    if (!verdict.allowed) {
      throw new AppException(
        'MODERATION_FAILED',
        'Honest is welcome, abuse is not. Please rewrite your perspective without insults or sexual content.',
      );
    }

    await this.daily.ensureDay(viewerId, now);
    let created;
    try {
      created = await this.prisma.perspective.create({
        data: {
          postId: post.id,
          giverId: viewerId,
          ownerId: post.ownerId,
          comment: input.comment,
          chips: input.chips,
          status: 'delivered',
          receivedDayKey: this.daily.today(now),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException('ALREADY_SUBMITTED', 'You already gave a perspective on this post.');
      }
      throw err;
    }

    await this.daily.markGiven(viewerId, post.ownerId, now);
    const connect = input.connect ? await this.connect.tryConnect(viewerId, post.ownerId, now) : null;
    const ownerRow = await this.prisma.user.findUniqueOrThrow({ where: { id: post.ownerId }, include: PROFILE_USER_INCLUDE });
    return {
      perspective: {
        id: created.id,
        post: this.mapper.postRef(post),
        owner: this.mapper.summary(ownerRow),
        comment: created.comment,
        chips: created.chips,
        thanked: false,
        createdAt: created.createdAt.toISOString(),
      },
      daily: await this.daily.status(viewerId, now),
      connect,
    };
  }

  /** Received perspectives and connect requests; items stay locked until the day's set is done. */
  async inbox(viewerId: string, now: Date = new Date()): Promise<Inbox> {
    const daily = await this.daily.status(viewerId, now);
    const latestUnlocked = await this.daily.latestUnlockedDay(viewerId);
    const blocked = await this.social.blockedIds(viewerId);

    const [rows, requests] = await Promise.all([
      this.prisma.perspective.findMany({
        where: { ownerId: viewerId, status: { not: 'removed' }, giverId: { notIn: [...blocked] } },
        include: RECEIVED_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.connectRequest.findMany({
        where: { receiverId: viewerId, status: 'pending', senderId: { notIn: [...blocked] } },
        include: { sender: { include: PROFILE_USER_INCLUDE }, perspective: { include: { post: { include: POST_INCLUDE } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const revealed = rows.filter((r) => isRevealed(r.receivedDayKey, latestUnlocked));
    const lockedPerspectiveIds = new Set(rows.filter((r) => !isRevealed(r.receivedDayKey, latestUnlocked)).map((r) => r.id));
    const visibleRequests = requests.filter((r) => isRevealed(r.receivedDayKey, latestUnlocked));
    const lockedRequests = requests.filter(
      (r) => !isRevealed(r.receivedDayKey, latestUnlocked) && !lockedPerspectiveIds.has(r.perspectiveId),
    );
    const pendingFromGiver = new Map(visibleRequests.map((r) => [r.senderId, r.id]));
    // Accepting needs the viewer to have given the asker a perspective too (both must give).
    const gaveBackTo = new Set(
      (
        await this.prisma.perspective.findMany({
          where: { giverId: viewerId, ownerId: { in: visibleRequests.map((r) => r.senderId) }, status: { not: 'removed' } },
          select: { ownerId: true },
          distinct: ['ownerId'],
        })
      ).map((p) => p.ownerId),
    );

    const groups = new Map<string, InboxGroup>();
    for (const row of revealed) {
      const group = groups.get(row.postId) ?? { post: this.mapper.postRef(row.post), perspectives: [] };
      group.perspectives.push(this.received(row, pendingFromGiver.get(row.giverId) ?? null));
      groups.set(row.postId, group);
    }

    return {
      daily,
      lockedCount: lockedPerspectiveIds.size + lockedRequests.length,
      groups: [...groups.values()],
      connectRequests: visibleRequests.map((r) => ({
        id: r.id,
        gaveBack: gaveBackTo.has(r.senderId),
        sender: this.mapper.summary(r.sender),
        perspective: {
          id: r.perspective.id,
          comment: r.perspective.comment,
          chips: r.perspective.chips,
          post: this.mapper.postRef(r.perspective.post),
        },
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /** Helpful / not helpful (with reason) / thank privately. Only the post owner, after unlock. */
  async feedback(viewerId: string, perspectiveId: string, raw: PerspectiveFeedbackInput): Promise<PerspectiveFeedback> {
    const input = PerspectiveFeedbackInputSchema.parse(raw);
    const row = await this.prisma.perspective.findUnique({ where: { id: perspectiveId } });
    if (!row || row.ownerId !== viewerId || row.status === 'removed') {
      throw new AppException('NOT_FOUND', 'Perspective not found.');
    }
    if (!isRevealed(row.receivedDayKey, await this.daily.latestUnlockedDay(viewerId))) {
      throw new AppException('DAILY_UNLOCK_INCOMPLETE', 'Finish today’s perspectives to see this one.');
    }
    const helpful = input.verdict === 'helpful';
    const updated = await this.prisma.perspective.update({
      where: { id: perspectiveId },
      data: {
        verdict: input.verdict,
        notHelpfulReason: helpful ? null : (input.reason ?? null),
        thankedAt: helpful ? (input.thankPrivately ? (row.thankedAt ?? new Date()) : row.thankedAt) : null,
        status: helpful ? 'helpful' : 'archived',
      },
    });
    return {
      verdict: input.verdict,
      reason: updated.notHelpfulReason,
      thanked: updated.thankedAt !== null,
    };
  }

  /** Perspectives the viewer gave. Givers see whether they were thanked, never the verdict. */
  async given(viewerId: string): Promise<GivenPerspective[]> {
    const blocked = await this.social.blockedIds(viewerId);
    const rows = await this.prisma.perspective.findMany({
      where: { giverId: viewerId, status: { not: 'removed' }, ownerId: { notIn: [...blocked] } },
      include: { post: { include: POST_INCLUDE }, owner: { include: PROFILE_USER_INCLUDE } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      post: this.mapper.postRef(r.post),
      owner: this.mapper.summary(r.owner),
      comment: r.comment,
      chips: r.chips,
      thanked: r.thankedAt !== null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private received(row: ReceivedRow, pendingConnectRequestId: string | null): ReceivedPerspective {
    return {
      id: row.id,
      post: this.mapper.postRef(row.post),
      giver: this.mapper.summary(row.giver),
      comment: row.comment,
      chips: row.chips,
      feedback: row.verdict
        ? { verdict: row.verdict, reason: row.notHelpfulReason, thanked: row.thankedAt !== null }
        : null,
      pendingConnectRequestId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
