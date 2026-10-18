import type { ConnectionCloseReason, ConnectionExpiry } from '@perspective/contracts';

/**
 * Quiet connections close on their own (docs/PRODUCT.md, "Quiet connections"):
 * - Nobody writes: a reminder after `noMessageRemindDays`, closed after `noMessageCloseDays`.
 * - Someone writes first and the other does not reply: the clock starts when the quiet person first
 *   opens the chat after that message. A warning after `firstReplyWarnHours`, closed after
 *   `firstReplyCloseHours`. If they never open it, it closes `firstReplyBackstopDays` after the message.
 *   More messages from the person who wrote first do not restart the clock.
 * - Both have written: closed after `inactivityCloseDays` without any message.
 * Everything counts from `connectedAt`, so a pair that reconnects starts fresh.
 */
export interface ExpiryConfig {
  firstReplyWarnHours: number;
  firstReplyCloseHours: number;
  firstReplyBackstopDays: number;
  noMessageRemindDays: number;
  noMessageCloseDays: number;
  inactivityCloseDays: number;
}

export interface ExpiryFacts {
  now: Date;
  connectedAt: Date;
  /** First message since `connectedAt`, or null. */
  firstMessage: { senderId: string; at: Date } | null;
  /** Whether the other person has written since `connectedAt`. */
  partnerReplied: boolean;
  /** Latest message since `connectedAt`, or null. */
  lastMessageAt: Date | null;
  /** When the person who owes the first reply first opened the chat after the first message. */
  firstReplySeenAt: Date | null;
}

export type ExpiryPhase = 'no_message' | 'awaiting_reply' | 'established';

export interface ExpiryDecision {
  phase: ExpiryPhase;
  /** Close now, with this reason. */
  close: ConnectionCloseReason | null;
  /** Show the reminder or the warning now. */
  warn: boolean;
  /** Who is expected to write next (the quiet person), when the rule is waiting on one person. */
  quietUserId: string | null;
  closesAt: Date | null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

export function evaluateExpiry(f: ExpiryFacts, partnerOf: (userId: string) => string, c: ExpiryConfig): ExpiryDecision {
  if (!f.firstMessage) {
    const closesAt = plus(f.connectedAt, c.noMessageCloseDays * DAY);
    if (f.now >= closesAt) return { phase: 'no_message', close: 'no_message', warn: false, quietUserId: null, closesAt };
    const warn = f.now >= plus(f.connectedAt, c.noMessageRemindDays * DAY);
    return { phase: 'no_message', close: null, warn, quietUserId: null, closesAt };
  }

  if (!f.partnerReplied) {
    const quietUserId = partnerOf(f.firstMessage.senderId);
    const backstop = plus(f.firstMessage.at, c.firstReplyBackstopDays * DAY);
    if (!f.firstReplySeenAt) {
      if (f.now >= backstop) return { phase: 'awaiting_reply', close: 'no_reply', warn: false, quietUserId, closesAt: backstop };
      return { phase: 'awaiting_reply', close: null, warn: false, quietUserId, closesAt: backstop };
    }
    const closesAt = plus(f.firstReplySeenAt, c.firstReplyCloseHours * HOUR);
    if (f.now >= closesAt) return { phase: 'awaiting_reply', close: 'no_reply', warn: false, quietUserId, closesAt };
    const warn = f.now >= plus(f.firstReplySeenAt, c.firstReplyWarnHours * HOUR);
    return { phase: 'awaiting_reply', close: null, warn, quietUserId, closesAt };
  }

  const last = f.lastMessageAt ?? f.firstMessage.at;
  const closesAt = plus(last, c.inactivityCloseDays * DAY);
  if (f.now >= closesAt) return { phase: 'established', close: 'inactive', warn: false, quietUserId: null, closesAt };
  return { phase: 'established', close: null, warn: false, quietUserId: null, closesAt };
}

/**
 * What one viewer is told. The person who wrote first only ever sees `waiting`, never whether the
 * other person has opened the chat; the quiet person only hears about the deadline once warned.
 */
export function expiryForViewer(d: ExpiryDecision, viewerId: string): ConnectionExpiry {
  if (d.close) return { state: 'ok', closesAt: null };
  switch (d.phase) {
    case 'no_message':
      return d.warn ? { state: 'remind', closesAt: d.closesAt!.toISOString() } : { state: 'ok', closesAt: null };
    case 'awaiting_reply':
      if (d.quietUserId !== viewerId) return { state: 'waiting', closesAt: null };
      return d.warn ? { state: 'you_owe_reply', closesAt: d.closesAt!.toISOString() } : { state: 'ok', closesAt: null };
    default:
      return { state: 'ok', closesAt: null };
  }
}
