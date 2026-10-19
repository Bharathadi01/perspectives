import type { MatchReason } from '@perspective/contracts';
import { weightedPick } from './random';

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
  /** Mandatory slots (boost or not) already holding this profile today, across all viewers. */
  assignedToday?: number;
  /** The owner opened the app recently or the profile is new; only these can take the boost slot. */
  boostReady?: boolean;
  /** Distinct people who reported this profile in the report lookback window. */
  recentReporters?: number;
}

export type SlotKind = 'boost' | 'mandatory';

export interface PickedSlot {
  id: string;
  slot: SlotKind;
}

export interface AssignmentPolicy {
  /** Seeds the boost pick, normally `${viewerId}:${dayKey}`, so a replay gives the same set. */
  seed: string;
  /** Most mandatory slots one profile may hold per day; over-cap profiles are used only when nothing else is left. */
  assignCap: number | null;
  /** How many of the least-served profiles the boost is chosen from. 1 means always the single least-served. */
  boostPoolSize: number;
  /** Distinct recent reporters that keep a profile out of every mandatory slot (0 turns this off). */
  pauseReporters: number;
}

/** Without a policy the set is strict: the single least-served profile, no cap, no report pause. */
export const STRICT_ASSIGNMENT_POLICY: AssignmentPolicy = { seed: '', assignCap: null, boostPoolSize: 1, pauseReporters: 0 };

/** Perspectives received recently plus mandatory slots already holding the profile today. */
export function served(c: AssignmentCandidate): number {
  return c.recentReceived + (c.assignedToday ?? 0);
}

function byLeastServed(a: AssignmentCandidate, b: AssignmentCandidate): number {
  return served(a) - served(b) || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

function byScore(a: AssignmentCandidate, b: AssignmentCandidate): number {
  return b.score - a.score || a.id.localeCompare(b.id);
}

function isPaused(c: AssignmentCandidate, p: AssignmentPolicy): boolean {
  return p.pauseReporters > 0 && (c.recentReporters ?? 0) >= p.pauseReporters;
}

/** Whether a profile may hold a mandatory slot at all (used to re-check a pending slot). */
export function mayHoldMandatorySlot(c: AssignmentCandidate, p: AssignmentPolicy): boolean {
  return !isPaused(c, p);
}

function underCap(c: AssignmentCandidate, p: AssignmentPolicy): boolean {
  return p.assignCap === null || (c.assignedToday ?? 0) < p.assignCap;
}

/**
 * The boost slot: among profiles that are safe, recently active and under today's cap, take the
 * least-served (and those at most one perspective above them, up to `boostPoolSize`), then pick one
 * at random, giving a better fit a somewhat higher chance. Null when nobody qualifies.
 */
function pickBoost(
  candidates: readonly AssignmentCandidate[],
  taken: ReadonlySet<string>,
  p: AssignmentPolicy,
  slotIndex: number,
): AssignmentCandidate | null {
  const pool = candidates
    .filter((c) => !taken.has(c.id) && !isPaused(c, p) && (c.boostReady ?? true) && underCap(c, p))
    .sort(byLeastServed);
  if (pool.length === 0) return null;
  const lowest = served(pool[0]);
  const near = pool.filter((c) => served(c) <= lowest + 1).slice(0, Math.max(1, p.boostPoolSize));
  return weightedPick(near, (c) => 0.5 + (c.compatibilityScore ?? 0.5), `${p.seed}:boost:${slotIndex}`);
}

/** A relevance slot: the best score among safe profiles, preferring those under today's cap. */
function pickRelevant(
  candidates: readonly AssignmentCandidate[],
  taken: ReadonlySet<string>,
  p: AssignmentPolicy,
): AssignmentCandidate | null {
  const open = candidates.filter((c) => !taken.has(c.id) && !isPaused(c, p)).sort(byScore);
  return open.find((c) => underCap(c, p)) ?? open[0] ?? null;
}

/**
 * Builds today's mandatory set: one boost slot for a low-response profile, then the best
 * relevance matches. When no profile qualifies for the boost, every slot is a relevance slot.
 * Returns fewer than `count` when not enough profiles are eligible.
 */
export function pickDailySet(
  candidates: readonly AssignmentCandidate[],
  count: number,
  policy: AssignmentPolicy = STRICT_ASSIGNMENT_POLICY,
): PickedSlot[] {
  if (count <= 0) return [];
  const picks: PickedSlot[] = [];
  const taken = new Set<string>();
  const boost = pickBoost(candidates, taken, policy, 0);
  if (boost) {
    picks.push({ id: boost.id, slot: 'boost' });
    taken.add(boost.id);
  }
  while (picks.length < count) {
    const next = pickRelevant(candidates, taken, policy);
    if (!next) break;
    picks.push({ id: next.id, slot: 'mandatory' });
    taken.add(next.id);
  }
  return picks;
}

/**
 * Picks a replacement for a skipped or invalidated slot, keeping the slot's purpose when it can.
 * A boost slot with no qualifying low-response profile is refilled as a relevance slot.
 */
export function pickReplacement(
  candidates: readonly AssignmentCandidate[],
  slot: SlotKind,
  policy: AssignmentPolicy = STRICT_ASSIGNMENT_POLICY,
  slotIndex = 0,
): PickedSlot | null {
  const none = new Set<string>();
  if (slot === 'boost') {
    const boost = pickBoost(candidates, none, policy, slotIndex);
    if (boost) return { id: boost.id, slot: 'boost' };
  }
  const relevant = pickRelevant(candidates, none, policy);
  return relevant ? { id: relevant.id, slot: 'mandatory' } : null;
}
