/**
 * Feed ranking v1. The factors come from docs/PRODUCT.md; the weights are PLACEHOLDERS — the
 * product owner has not decided them and they are meant to be tuned during development.
 */
export interface RankingFactors {
  /** 0..1, higher when the profile is under-served (few recent perspectives). */
  reciprocityNeed: number;
  /** 0..1, newer profiles score higher. */
  freshness: number;
  /** 0..1, overlap between the viewer's and the candidate's post categories. */
  categoryAffinity: number;
  /** 0..1, how helpful the candidate's own perspectives have been. */
  qualityPrior: number;
  /** Subtracted; reports and over-exposure. */
  penalties: number;
}

export const PLACEHOLDER_WEIGHTS = {
  reciprocityNeed: 0.35,
  freshness: 0.2,
  categoryAffinity: 0.2,
  qualityPrior: 0.25,
} as const;

export function rankingScore(f: RankingFactors): number {
  return (
    PLACEHOLDER_WEIGHTS.reciprocityNeed * f.reciprocityNeed +
    PLACEHOLDER_WEIGHTS.freshness * f.freshness +
    PLACEHOLDER_WEIGHTS.categoryAffinity * f.categoryAffinity +
    PLACEHOLDER_WEIGHTS.qualityPrior * f.qualityPrior -
    f.penalties
  );
}

export function reciprocityNeed(recentReceived: number): number {
  return 1 / (1 + Math.max(0, recentReceived));
}

export function freshness(profileAgeDays: number): number {
  return Math.exp(-Math.max(0, profileAgeDays) / 30);
}

export function categoryAffinity(viewer: readonly string[], candidate: readonly string[]): number {
  if (viewer.length === 0 || candidate.length === 0) return 0;
  const set = new Set(viewer);
  const shared = new Set(candidate.filter((c) => set.has(c)));
  return shared.size / new Set(candidate).size;
}

export function qualityPrior(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  return total === 0 ? 0.5 : helpful / total;
}

export function reportPenalty(reportCount: number): number {
  return 0.1 * Math.min(reportCount, 5);
}
