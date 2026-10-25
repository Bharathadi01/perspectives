import type { Connection, Message } from '@perspective/contracts';

/** Messages from one person this close together read as one burst: one tail, one time. */
export const RUN_GAP_MS = 5 * 60 * 1000;

/** A message the app has sent, or tried to, that the server has not confirmed yet. */
export interface PendingMessage {
  localId: string;
  text: string;
  /** Reused on retry, so a resend can never post the message twice. */
  key: string;
  createdAt: string;
  status: 'sending' | 'failed';
}

export type ThreadItem =
  | { type: 'day'; key: string; label: string }
  | {
      type: 'message';
      key: string;
      text: string;
      mine: boolean;
      createdAt: string;
      /** First and last bubble of a run from the same person, for the corner shapes. */
      first: boolean;
      last: boolean;
      status: 'sent' | 'sending' | 'failed';
      /** Set on pending messages, for retry. */
      localId?: string;
    };

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Today", "Yesterday", "Tuesday" within the week, else "12 Oct" (with the year when it is not this year). */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[d.getDay()];
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}

/** "9:05" style clock time in the phone's own 12/24-hour setting. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** The time on a list row: the clock today, then "Yesterday", the weekday, the date. */
export function listTime(iso: string, now: Date = new Date()): string {
  const label = dayLabel(iso, now);
  return label === 'Today' ? clockTime(iso) : label.length > 3 && WEEKDAYS.includes(label) ? label.slice(0, 3) : label;
}

/** "Connected yesterday", "Connected on Tuesday", "Connected 12 Oct". */
export function connectedLabel(iso: string, now: Date = new Date()): string {
  const label = dayLabel(iso, now);
  if (label === 'Today' || label === 'Yesterday') return `Connected ${label.toLowerCase()}`;
  if (WEEKDAYS.includes(label)) return `Connected on ${label}`;
  return `Connected ${label}`;
}

/**
 * The thread, oldest first: server messages, then anything still sending or
 * failed, with a day divider wherever the date changes and each message marked
 * as the first or last of its run. When `connectedAt` is given, the first
 * divider is left out if it falls on that day: the "Connected …" line above
 * the thread already says it.
 */
export function buildThread(
  messages: readonly Message[],
  pending: readonly PendingMessage[],
  partnerId: string,
  now: Date = new Date(),
  connectedAt?: string,
): ThreadItem[] {
  const rows: Array<{ key: string; text: string; mine: boolean; createdAt: string; status: 'sent' | 'sending' | 'failed'; localId?: string }> = [
    ...messages.map((m) => ({
      key: m.id,
      text: m.text,
      mine: m.senderId !== partnerId,
      createdAt: m.createdAt,
      status: 'sent' as const,
    })),
    // The queue drops a message once the server confirms it, so the two never overlap.
    ...pending.map((p) => ({ key: p.localId, text: p.text, mine: true, createdAt: p.createdAt, status: p.status, localId: p.localId })),
  ];

  const out: ThreadItem[] = [];
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const at = new Date(row.createdAt);
    const coveredByConnected = !prev && !!connectedAt && sameDay(new Date(connectedAt), at);
    if (!coveredByConnected && (!prev || !sameDay(new Date(prev.createdAt), at))) {
      out.push({ type: 'day', key: `day-${row.key}`, label: dayLabel(row.createdAt, now) });
    }
    const joinsPrev =
      !!prev && prev.mine === row.mine && sameDay(new Date(prev.createdAt), at) && at.getTime() - new Date(prev.createdAt).getTime() <= RUN_GAP_MS;
    const joinsNext =
      !!next &&
      next.mine === row.mine &&
      sameDay(new Date(next.createdAt), at) &&
      new Date(next.createdAt).getTime() - at.getTime() <= RUN_GAP_MS;
    out.push({ type: 'message', ...row, first: !joinsPrev, last: !joinsNext });
  });
  return out;
}

/** The line under a name in the list. Says "You:" before your own words, like every messenger. */
export function previewLine(connection: Pick<Connection, 'lastMessage' | 'partner'>): string {
  const last = connection.lastMessage;
  if (!last) return 'You both gave perspectives. Say hi.';
  return last.senderId === connection.partner.id ? last.text : `You: ${last.text}`;
}

/**
 * Whether the next message is yours to write: they wrote last, or nobody has
 * written yet. Worked out from who wrote last only — the app keeps no read state.
 */
export function isYourTurn(connection: Pick<Connection, 'lastMessage' | 'partner'>): boolean {
  return !connection.lastMessage || connection.lastMessage.senderId === connection.partner.id;
}

/** The perspective the other person gave you, which is all of the start the chat shows you. */
export interface TheirOpening {
  comment: string;
  /** The question on your post that they answered. */
  prompt: string;
  /** Your post's photo, when it was a photo post. */
  photoUrl: string | null;
  postKind: 'photo' | 'audio' | 'text' | null;
}

/**
 * What the other person said to you when you connected, or null when there is
 * none to show (an older connection where you asked and their give-back was
 * not kept). Your own perspective is never part of it: each person sees only
 * the words that were given to them.
 */
export function theirOpening(connection: Pick<Connection, 'origin' | 'reply' | 'partner'>): TheirOpening | null {
  const line = [connection.origin, connection.reply].find((l) => l?.fromUserId === connection.partner.id);
  if (!line) return null;
  return {
    comment: line.comment,
    prompt: line.postPrompt,
    photoUrl: line.post?.kind === 'photo' ? (line.post.mediaUrl ?? null) : null,
    postKind: line.post?.kind ?? null,
  };
}
