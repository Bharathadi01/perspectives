import type { MatchReason } from '@perspective/contracts';

export interface AssignmentCandidate {
  id: string;
  /** Perspectives received in the boost lookback window. */
  recentReceived: number;
  /** Feed ranking score (higher is a better match). */
  score: number;
  /** Used to break ties: longer-waiting profiles first. */
  createdAt: Date;
  compatibilityScore?: number;
  matchReasons?: MatchReason[];
}

export type SlotKind = 'boost' | 'mandatory';

export interface PickedSlot {
  id: string;
  slot: SlotKind;
}

function byLeastServed(a: AssignmentCandidate, b: AssignmentCandidate): number {
  return (
    a.recentReceived - b.recentReceived ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

function byScore(a: AssignmentCandidate, b: AssignmentCandidate): number {
  return b.score - a.score || a.id.localeCompare(b.id);
}

/**
 * Builds today's mandatory set: one boost slot for the least-served eligible profile, then the
 * best relevance matches. Returns fewer than `count` when not enough profiles are eligible.
 */
export function pickDailySet(candidates: readonly AssignmentCandidate[], count: number): PickedSlot[] {
  if (count <= 0 || candidates.length === 0) return [];
  const boost = [...candidates].sort(byLeastServed)[0];
  const rest = candidates
    .filter((c) => c.id !== boost.id)
    .sort(byScore)
    .slice(0, count - 1)
    .map((c): PickedSlot => ({ id: c.id, slot: 'mandatory' }));
  return [{ id: boost.id, slot: 'boost' }, ...rest];
}

/** Picks a replacement for a skipped or invalidated slot, keeping the slot's purpose. */
export function pickReplacement(candidates: readonly AssignmentCandidate[], slot: SlotKind): string | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort(slot === 'boost' ? byLeastServed : byScore);
  return sorted[0].id;
}
