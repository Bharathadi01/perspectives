import type { ErrorCode } from '@perspective/contracts';

export interface ConnectState {
  now: Date;
  isSelf: boolean;
  /** Receiver exists, is active, and has a live profile. */
  receiverAvailable: boolean;
  viewerBlockedReceiver: boolean;
  receiverBlockedViewer: boolean;
  hasActiveConnection: boolean;
  hasPendingOutgoing: boolean;
  pendingIncomingId: string | null;
  /** Latest perspective the viewer gave on any of the receiver's posts (the gate), or null. */
  gatePerspectiveId: string | null;
  /** When the receiver last declined a request from the viewer, or null. */
  lastDeclinedAt: Date | null;
  cooldownDays: number;
  /** When the pair's connection last closed on its own for being quiet, or null. */
  lastAutoClosedAt?: Date | null;
  /** Wait after such a closure before asking again (0, the default, behaves like an unmatch). */
  reopenCooldownDays?: number;
  sentToday: number;
  dailyCap: number | null;
}

/** The later of the decline cooldown and the quiet-closure cooldown, or null when neither applies. */
export function requestAvailableAt(s: ConnectState): Date | null {
  const declined = cooldownUntil(s.lastDeclinedAt, s.cooldownDays, s.now);
  const reopened = cooldownUntil(s.lastAutoClosedAt ?? null, s.reopenCooldownDays ?? 0, s.now);
  if (!declined) return reopened;
  if (!reopened) return declined;
  return declined > reopened ? declined : reopened;
}

export type ConnectDecision =
  | { ok: true; perspectiveId: string }
  | { ok: false; code: ErrorCode; message: string; details?: Record<string, unknown> };

export function cooldownUntil(lastDeclinedAt: Date | null, cooldownDays: number, now: Date): Date | null {
  if (!lastDeclinedAt || cooldownDays <= 0) return null;
  const until = new Date(lastDeclinedAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
  return until > now ? until : null;
}

/**
 * The connect rules from docs/PRODUCT.md: open Connect with no intent, allowed only after the
 * sender has given the receiver a perspective, never while blocked, already connected or pending,
 * and not within the cooldown after a decline.
 */
export function evaluateConnect(s: ConnectState): ConnectDecision {
  if (s.isSelf || !s.receiverAvailable || s.receiverBlockedViewer) {
    return { ok: false, code: 'NOT_FOUND', message: 'This person is not available.' };
  }
  if (s.viewerBlockedReceiver) {
    return { ok: false, code: 'BLOCKED_PAIR', message: 'You blocked this person.' };
  }
  if (s.hasActiveConnection) {
    return { ok: false, code: 'ALREADY_CONNECTED', message: 'You are already connected.' };
  }
  if (s.hasPendingOutgoing) {
    return { ok: false, code: 'CONNECT_REQUEST_PENDING', message: 'Your request is waiting for their answer.' };
  }
  if (s.pendingIncomingId) {
    return {
      ok: false,
      code: 'CONNECT_REQUEST_PENDING',
      message: 'They already asked to connect with you. Answer their request in your Inbox.',
      details: { incomingRequestId: s.pendingIncomingId },
    };
  }
  if (!s.gatePerspectiveId) {
    return {
      ok: false,
      code: 'PERSPECTIVE_REQUIRED_BEFORE_CONNECT',
      message: 'Give them a perspective first, then you can ask to connect.',
    };
  }
  const until = requestAvailableAt(s);
  if (until) {
    return {
      ok: false,
      code: 'CONNECT_COOLDOWN_ACTIVE',
      message: 'You can ask this person again later.',
      details: { availableAt: until.toISOString() },
    };
  }
  if (s.dailyCap !== null && s.sentToday >= s.dailyCap) {
    return { ok: false, code: 'CAP_REACHED', message: 'You have reached today’s connect limit.' };
  }
  return { ok: true, perspectiveId: s.gatePerspectiveId };
}

export interface AcceptState {
  /** Whether the person accepting has given the asker a perspective (any non-removed one). */
  receiverGaveToSender: boolean;
}

export type AcceptDecision = { ok: true } | { ok: false; code: ErrorCode; message: string };

/**
 * Both must give (product decision 2026-10-18): the asker gave the first perspective, and the person
 * accepting must give one back before the chat opens.
 */
export function evaluateAccept(s: AcceptState): AcceptDecision {
  if (!s.receiverGaveToSender) {
    return {
      ok: false,
      code: 'PERSPECTIVE_REQUIRED_BEFORE_ACCEPT',
      message: 'Give them a perspective first, then you can accept.',
    };
  }
  return { ok: true };
}
