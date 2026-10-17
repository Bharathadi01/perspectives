import type { DatingIntention, LifestylePace, MatchReason, SocialPreference } from '@perspective/contracts';
import { DATING_INTENTION_CONFIG, getInterestById } from '@perspective/contracts';
import type { Person } from '../social/social.service';

/**
 * Stage 2: Multidimensional Compatibility Scoring and Explainability
 * As specified in docs/ONBOARDING_AND_MATCHING_RESEARCH.md:
 * - 40% Shared Interests (Jaccard Similarity)
 * - 25% Dating Intentions Compatibility (Matrix)
 * - 20% Category & Preference Affinity
 * - 15% Lifestyle & Social Rhythm Compatibility
 * Missing data is renormalized dynamically so omissions are never penalized as zero.
 */

export interface CompatibilityResult {
  score: number;
  coverage: number;
  reasons: MatchReason[];
}

/** Jaccard similarity for explicit interests: |A ∩ B| / |A ∪ B| */
export function interestSimilarity(
  viewerInterests: readonly string[],
  candidateInterests: readonly string[],
): { score: number; sharedIds: string[]; isKnown: boolean } {
  if (viewerInterests.length === 0 || candidateInterests.length === 0) {
    return { score: 0.5, sharedIds: [], isKnown: false };
  }
  const setA = new Set(viewerInterests);
  const setB = new Set(candidateInterests);
  const shared = viewerInterests.filter((id) => setB.has(id));
  const union = new Set([...viewerInterests, ...candidateInterests]);
  const score = union.size === 0 ? 0.5 : shared.length / union.size;
  return { score, sharedIds: shared, isKnown: true };
}

/** Dating intentions alignment matrix */
export function datingIntentionCompatibility(
  viewer: DatingIntention | null,
  candidate: DatingIntention | null,
): { score: number; isKnown: boolean; compatible: boolean } {
  if (!viewer || !candidate) {
    return { score: 0.5, isKnown: false, compatible: true };
  }
  if (viewer === candidate) {
    return { score: 1.0, isKnown: true, compatible: true };
  }

  // Compatible adjacent
  if (
    (viewer === 'long_term' && candidate === 'long_term_open') ||
    (viewer === 'long_term_open' && candidate === 'long_term')
  ) {
    return { score: 0.85, isKnown: true, compatible: true };
  }
  if (
    (viewer === 'long_term_open' && candidate === 'short_term_open') ||
    (viewer === 'short_term_open' && candidate === 'long_term_open')
  ) {
    return { score: 0.7, isKnown: true, compatible: true };
  }
  if (
    (viewer === 'short_term_open' && candidate === 'casual') ||
    (viewer === 'casual' && candidate === 'short_term_open')
  ) {
    return { score: 0.85, isKnown: true, compatible: true };
  }

  // Exploratory
  if (viewer === 'figuring_out' || candidate === 'figuring_out') {
    return { score: 0.6, isKnown: true, compatible: true };
  }

  // Friendship
  if (viewer === 'friendship' || candidate === 'friendship') {
    return { score: 0.35, isKnown: true, compatible: true };
  }

  // Opposing (e.g. long_term vs casual)
  return { score: 0.15, isKnown: true, compatible: false };
}

/** Lifestyle pace and social energy harmony */
export function lifestyleCompatibility(
  viewerPace: LifestylePace | null,
  candidatePace: LifestylePace | null,
  viewerSocial: SocialPreference | null,
  candidateSocial: SocialPreference | null,
): { score: number; isKnown: boolean } {
  let matchedComponents = 0;
  let totalScore = 0;

  if (viewerPace && candidatePace) {
    matchedComponents++;
    if (viewerPace === candidatePace) totalScore += 1.0;
    else if (viewerPace === 'balanced' || candidatePace === 'balanced') totalScore += 0.75;
    else if (
      (viewerPace === 'early_bird' && candidatePace === 'night_owl') ||
      (viewerPace === 'night_owl' && candidatePace === 'early_bird')
    ) {
      totalScore += 0.3;
    } else totalScore += 0.6;
  }

  if (viewerSocial && candidateSocial) {
    matchedComponents++;
    if (viewerSocial === candidateSocial) totalScore += 1.0;
    else if (viewerSocial === 'ambivert' || candidateSocial === 'ambivert') totalScore += 0.8;
    else if (
      (viewerSocial === 'introvert' && candidateSocial === 'social_butterfly') ||
      (viewerSocial === 'social_butterfly' && candidateSocial === 'introvert')
    ) {
      totalScore += 0.35;
    } else totalScore += 0.65;
  }

  if (matchedComponents === 0) {
    return { score: 0.5, isKnown: false };
  }
  return { score: totalScore / matchedComponents, isKnown: true };
}

/** Overlap between viewer and candidate post categories */
export function categoryAffinity(viewer: readonly string[], candidate: readonly string[]): number {
  if (viewer.length === 0 || candidate.length === 0) return 0;
  const set = new Set(viewer);
  const shared = new Set(candidate.filter((c) => set.has(c)));
  return shared.size / new Set(candidate).size;
}

/** Compute overall pairwise compatibility score with explainable reasons */
export function computeCompatibility(viewer: Person, candidate: Person): CompatibilityResult {
  const reasons: MatchReason[] = [];

  // 1. Shared Interests
  const intRes = interestSimilarity(viewer.interests, candidate.interests);
  if (intRes.sharedIds.length > 0) {
    const labels = intRes.sharedIds
      .slice(0, 2)
      .map((id) => getInterestById(id)?.label ?? id)
      .join(' & ');
    reasons.push({
      kind: 'shared_interest',
      text: `You both share passion for ${labels}`,
    });
  }

  // 2. Dating Intentions
  const intentRes = datingIntentionCompatibility(viewer.datingIntention, candidate.datingIntention);
  if (intentRes.isKnown && intentRes.score >= 0.7) {
    if (viewer.datingIntention === candidate.datingIntention && viewer.datingIntention) {
      const cfg = DATING_INTENTION_CONFIG[viewer.datingIntention];
      reasons.push({
        kind: 'dating_intention',
        text: `Both looking for ${cfg?.label ?? 'the same thing'}`,
      });
    } else {
      reasons.push({
        kind: 'dating_intention',
        text: 'Compatible dating intentions',
      });
    }
  }

  // 3. Category Affinity
  const catScore = categoryAffinity(viewer.postCategories, candidate.postCategories);
  if (catScore >= 0.5 && viewer.postCategories.length > 0) {
    reasons.push({
      kind: 'category_resonance',
      text: 'Similar perspective topics and aesthetic interests',
    });
  }

  // 4. Lifestyle
  const lifeRes = lifestyleCompatibility(
    viewer.lifestylePace,
    candidate.lifestylePace,
    viewerSocial(viewer),
    viewerSocial(candidate),
  );

  // Dynamic Weight Normalization
  let totalWeight = 0;
  let weightedSum = 0;
  let coverageComponents = 0;

  if (intRes.isKnown) {
    weightedSum += 0.4 * intRes.score;
    totalWeight += 0.4;
    coverageComponents++;
  }
  if (intentRes.isKnown) {
    weightedSum += 0.25 * intentRes.score;
    totalWeight += 0.25;
    coverageComponents++;
  }
  if (viewer.postCategories.length > 0 && candidate.postCategories.length > 0) {
    weightedSum += 0.2 * catScore;
    totalWeight += 0.2;
    coverageComponents++;
  }
  if (lifeRes.isKnown) {
    weightedSum += 0.15 * lifeRes.score;
    totalWeight += 0.15;
    coverageComponents++;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  const coverage = coverageComponents / 4;

  return {
    score: Math.min(1.0, Math.max(0.0, score)),
    coverage,
    reasons,
  };
}

function viewerSocial(p: Person): SocialPreference | null {
  return p.socialPreference;
}

/** Feed ranking v2 combining compatibility with reciprocity, freshness, quality, and safety */
export interface RankingFactors {
  compatibility?: number;
  categoryAffinity?: number;
  reciprocityNeed: number;
  freshness: number;
  qualityPrior: number;
  penalties: number;
}

export const RANKING_WEIGHTS = {
  compatibility: 0.45,
  reciprocityNeed: 0.25,
  freshness: 0.15,
  qualityPrior: 0.15,
} as const;

export function rankingScore(f: RankingFactors): number {
  const comp = f.compatibility ?? f.categoryAffinity ?? 0.5;
  return (
    RANKING_WEIGHTS.compatibility * comp +
    RANKING_WEIGHTS.reciprocityNeed * f.reciprocityNeed +
    RANKING_WEIGHTS.freshness * f.freshness +
    RANKING_WEIGHTS.qualityPrior * f.qualityPrior -
    f.penalties
  );
}

export function reciprocityNeed(recentReceived: number): number {
  return 1 / (1 + Math.max(0, recentReceived));
}

export function freshness(profileAgeDays: number): number {
  return Math.exp(-Math.max(0, profileAgeDays) / 30);
}

export function qualityPrior(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  return total === 0 ? 0.5 : helpful / total;
}

export function reportPenalty(reportCount: number): number {
  return 0.1 * Math.min(reportCount, 5);
}
