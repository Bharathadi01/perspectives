import { RULES } from '@perspective/contracts';

/** How far the comment is from sendable: "40 more" counts down, then it is ready. */
export function readiness(comment: string): { remaining: number; ready: boolean; tooLong: boolean } {
  const length = comment.trim().length;
  const remaining = Math.max(0, RULES.commentMinLength - length);
  const tooLong = length > RULES.commentMaxLength;
  return { remaining, ready: remaining === 0 && !tooLong, tooLong };
}

/**
 * Toggle a quick pick, at most RULES.maxChips. `refused` is true when the tap was on an unselected
 * chip at the limit: nothing changes and the chip shakes.
 */
export function toggleChip(current: readonly string[], chip: string): { next: string[]; refused: boolean } {
  if (current.includes(chip)) return { next: current.filter((c) => c !== chip), refused: false };
  if (current.length >= RULES.maxChips) return { next: [...current], refused: true };
  return { next: [...current, chip], refused: false };
}

export interface GiveDraft {
  comment: string;
  chips: string[];
  connect: boolean;
}

/**
 * Unsent text per post, kept while the app is open so closing the composer never throws work away.
 * Not saved to disk: a draft is a convenience, not a promise.
 */
const drafts = new Map<string, GiveDraft>();

export function readDraft(postId: string): GiveDraft | undefined {
  return drafts.get(postId);
}

/** Keeps the draft only when there is something in it; an empty one is forgotten. */
export function saveDraft(postId: string, draft: GiveDraft): void {
  if (draft.comment.trim().length === 0 && draft.chips.length === 0) drafts.delete(postId);
  else drafts.set(postId, { comment: draft.comment, chips: [...draft.chips], connect: draft.connect });
}

export function clearDraft(postId: string): void {
  drafts.delete(postId);
}
