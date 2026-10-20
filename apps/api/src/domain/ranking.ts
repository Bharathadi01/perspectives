import type { MatchReason } from '@perspective/contracts';
import { getInterestById } from '@perspective/contracts';

/**
 * Feed ranking for the beta (docs/PRODUCT.md → Algorithms, decided 2026-10-20). Rule-based, every
 * weight tunable in config:
 *
 *   score = 0.45 × shared interests + 0.20 × need + 0.15 × recently active
 *         + 0.10 × new member + 0.10 × giving quality + 0.10 × fresh − report penalty
 *
 * "Fresh" (decided 2026-10-20) means the viewer never gave this person a perspective. It is a small
 * head start on top of the other weights, so a very good older match can still come first.
 *
 * Not used: daily rhythm, social energy, relationship goals, orientation, post-category overlap,
 * and any attractiveness or popularity score.
 */

export interface RankingWeights {
  sharedInterests: number;
  need: number;
  recentlyActive: number;
  newMember: number;
  givingQuality: number;
  fresh: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  sharedInterests: 0.45,
  need: 0.2,
  recentlyActive: 0.15,
  newMember: 0.1,
  givingQuality: 0.1,
  fresh: 0.1,
};

export interface RankingFactors {
  /** 0..1 interest overlap (0.5 when either side has no interests). */
  sharedInterests: number;
  /** 0..1, higher when the profile received fewer perspectives recently (counting today's sets). */
  need: number;
  /** 0..1, higher when the owner opened the app recently. */
  recentlyActive: number;
  /** 1 during the profile's first week, else 0. */
  newMember: number;
  /** 0..1, how often their own perspectives were marked helpful, neutral (0.5) until there are enough marks. */
  givingQuality: number;
  /** 1 when the viewer never gave this person a perspective, else 0. */
  fresh: number;
  /** Subtracted: distinct people who reported them. */
  penalties: number;
}

export function rankingScore(f: RankingFactors, w: RankingWeights = DEFAULT_RANKING_WEIGHTS): number {
  return (
    w.sharedInterests * f.sharedInterests +
    w.need * f.need +
    w.recentlyActive * f.recentlyActive +
    w.newMember * f.newMember +
    w.givingQuality * f.givingQuality +
    w.fresh * f.fresh -
    f.penalties
  );
}

/** Jaccard similarity for explicit interests: |A ∩ B| / |A ∪ B|. Unknown (0.5) when either side has none. */
export function interestSimilarity(
  viewerInterests: readonly string[],
  candidateInterests: readonly string[],
): { score: number; sharedIds: string[]; isKnown: boolean } {
  if (viewerInterests.length === 0 || candidateInterests.length === 0) {
    return { score: 0.5, sharedIds: [], isKnown: false };
  }
  const setB = new Set(candidateInterests);
  const shared = viewerInterests.filter((id) => setB.has(id));
  const union = new Set([...viewerInterests, ...candidateInterests]);
  return { score: shared.length / union.size, sharedIds: shared, isKnown: true };
}

export interface CompatibilityResult {
  /** 0..1, shared interests only. */
  score: number;
  reasons: MatchReason[];
}

/** How well two people fit, from shared interests only, with a plain-words reason when they share some. */
export function computeCompatibility(
  viewer: { interests: readonly string[] },
  candidate: { interests: readonly string[] },
): CompatibilityResult {
  const res = interestSimilarity(viewer.interests, candidate.interests);
  const reasons: MatchReason[] = [];
  if (res.sharedIds.length > 0) {
    const labels = res.sharedIds
      .slice(0, 2)
      .map((id) => getInterestById(id)?.label ?? id)
      .join(' & ');
    reasons.push({ kind: 'shared_interest', text: `You both share passion for ${labels}` });
  }
  return { score: res.score, reasons };
}

/** Need: 1 / (1 + perspectives received recently + mandatory sets already holding the profile today). */
export function reciprocityNeed(served: number): number {
  return 1 / (1 + Math.max(0, served));
}

/**
 * Recently active, from whole days since the owner last opened the app (0 = today):
 * today or yesterday 1.0, 2 to 3 days 0.5, 4 to 7 days 0.2, older or never 0.
 */
export function recentlyActiveScore(daysSinceActive: number | null): number {
  if (daysSinceActive === null || daysSinceActive < 0) return 0;
  if (daysSinceActive <= 1) return 1;
  if (daysSinceActive <= 3) return 0.5;
  if (daysSinceActive <= 7) return 0.2;
  return 0;
}

/** Days a profile counts as a new member. */
export const NEW_MEMBER_DAYS = 7;

/** New member: 1.0 during the profile's first week, then 0. */
export function newMemberScore(profileAgeDays: number): number {
  return profileAgeDays >= 0 && profileAgeDays < NEW_MEMBER_DAYS ? 1 : 0;
}

/** Marks needed before a giver's own record outweighs the neutral starting point. */
export const QUALITY_PRIOR_MARKS = 5;

/**
 * Giving quality: the share of a person's own perspectives that owners marked helpful, pulled toward
 * a neutral 0.5 until there are enough marks: (helpful + 0.5 × prior) / (marked + prior).
 */
export function givingQuality(helpful: number, notHelpful: number, prior = QUALITY_PRIOR_MARKS): number {
  const h = Math.max(0, helpful);
  const marked = h + Math.max(0, notHelpful);
  return (h + 0.5 * prior) / (marked + prior);
}

/** 0.1 for each different person who reported the profile in the window, up to 5. */
export function reportPenalty(distinctReporters: number): number {
  return 0.1 * Math.min(Math.max(0, distinctReporters), 5);
}
