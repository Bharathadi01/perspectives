import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { PushData, PushPlatform } from '@perspective/contracts';
import { addDays, todayKey } from '../common/day';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Push notifications (beta step 5, decided 2026-10-21: all seven events, placeholder texts). A push
 * never contains message or perspective text. Sending never fails the action that caused it: errors
 * are logged, and devices Expo no longer knows are switched off.
 */

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound: 'default';
}

export interface PushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/** Delivers pushes. Swap the class to change provider; callers use PushService. */
export abstract class PushSender {
  abstract send(messages: PushMessage[]): Promise<PushTicket[]>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo's push service (works for iOS and Android; needs an Expo project and a development build). */
@Injectable()
export class ExpoPushSender extends PushSender {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    const tickets: PushTicket[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const headers: Record<string, string> = { accept: 'application/json', 'content-type': 'application/json' };
      if (this.config.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${this.config.EXPO_ACCESS_TOKEN}`;
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk) });
      if (!res.ok) throw new Error(`Expo push service answered ${res.status}`);
      const json = (await res.json()) as { data?: PushTicket[] };
      tickets.push(...(json.data ?? chunk.map(() => ({ status: 'error' as const, message: 'No ticket' }))));
    }
    return tickets;
  }
}

/** Records pushes instead of sending them (tests and local runs without devices). */
@Injectable()
export class LogPushSender extends PushSender {
  private readonly logger = new Logger('Push');
  readonly sent: PushMessage[] = [];

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    this.sent.push(...messages);
    for (const m of messages) this.logger.log(`[push] ${m.title}: ${m.body}`);
    return messages.map(() => ({ status: 'ok' as const }));
  }
}

export interface PushNote {
  title: string;
  body: string;
  data: PushData;
  /** Send at most once per person per key (the daily reminder, chat warnings). */
  dedupeKey?: string;
  /** Account updates also reach suspended or banned people; everything else is skipped for them. */
  account?: boolean;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: PushSender,
  ) {}

  async registerToken(userId: string, token: string, platform: PushPlatform, now: Date = new Date()): Promise<void> {
    // A token belongs to one device; if someone else signs in on it, it moves to them.
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform, lastSeenAt: now },
      update: { userId, platform, lastSeenAt: now, disabledAt: null },
    });
  }

  /** A first name for push texts ("Meera sent you a message"). */
  async nameOf(userId: string): Promise<string> {
    const p = await this.prisma.profile.findUnique({ where: { userId }, select: { displayName: true } });
    return p?.displayName ?? 'Someone';
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  /** Sends in the background; the caller never waits for Expo and never fails because of it. */
  notify(userId: string, note: PushNote): void {
    const job = this.deliver(userId, note)
      .catch((err: unknown) => this.logger.error(`Push to ${userId} failed`, err instanceof Error ? err.stack : String(err)))
      .finally(() => this.inFlight.delete(job));
    this.inFlight.add(job);
  }

  /** Waits for pushes still being sent (used by tests and on shutdown). */
  async drain(): Promise<void> {
    while (this.inFlight.size > 0) await Promise.all([...this.inFlight]);
  }

  private async deliver(userId: string, note: PushNote): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, pushTokens: { where: { disabledAt: null }, select: { token: true } } },
    });
    if (!user || user.pushTokens.length === 0) return;
    if (user.status !== 'active' && !note.account) return;
    if (note.dedupeKey) {
      const claimed = await this.prisma.pushLog.createMany({ data: [{ userId, dedupeKey: note.dedupeKey }], skipDuplicates: true });
      if (claimed.count === 0) return;
    }
    const messages: PushMessage[] = user.pushTokens.map((t) => ({ to: t.token, title: note.title, body: note.body, data: note.data, sound: 'default' }));
    const tickets = await this.sender.send(messages);
    const gone = tickets.flatMap((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? [messages[i].to] : []));
    if (gone.length > 0) {
      await this.prisma.pushToken.updateMany({ where: { token: { in: gone } }, data: { disabledAt: new Date() } });
    }
  }
}

/**
 * The once-a-day "your profiles are ready" push (decided 2026-10-21, placeholder): after
 * PUSH_DAILY_HOUR in APP_TIMEZONE, to people who have a device, opened the app in the last 7 days and
 * have not opened it yet today. At most once a day each.
 */
@Injectable()
export class DailyPushScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyPushScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const minutes = this.config.EXPIRY_SWEEP_MINUTES;
    if (minutes <= 0 || this.config.PUSH_DAILY_HOUR === 0) return;
    this.timer = setInterval(() => void this.run().catch((err: unknown) => this.logger.error('Daily push failed', String(err))), minutes * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Returns how many people were reminded. */
  async run(now: Date = new Date()): Promise<number> {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: this.config.APP_TIMEZONE }).format(now));
    if (this.config.PUSH_DAILY_HOUR === 0 || hour < this.config.PUSH_DAILY_HOUR) return 0;
    const dayKey = todayKey(this.config.APP_TIMEZONE, now);
    const weekAgo = todayKey(this.config.APP_TIMEZONE, addDays(now, -7));
    const people = await this.prisma.user.findMany({
      where: {
        status: 'active',
        profile: { isLive: true },
        pushTokens: { some: { disabledAt: null } },
        dailyProgress: { some: { dayKey: { gte: weekAgo } }, none: { dayKey } },
      },
      select: { id: true },
    });
    for (const p of people) {
      this.push.notify(p.id, {
        title: 'Perspective',
        body: 'Your profiles for today are ready.',
        data: { screen: 'explore' },
        dedupeKey: `daily_set:${dayKey}`,
      });
    }
    return people.length;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PushSender,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => (config.PUSH_SENDER === 'log' ? new LogPushSender() : new ExpoPushSender(config)),
    },
    PushService,
    DailyPushScheduler,
  ],
  exports: [PushService, PushSender, DailyPushScheduler],
})
export class PushModule {}
