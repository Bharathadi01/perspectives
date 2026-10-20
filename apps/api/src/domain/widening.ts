/**
 * Automatic age widening (docs/PRODUCT.md → Audience, decided 2026-10-20): when someone's audience
 * leaves too few people (fewer than could fill a set of 2), the age range widens by 2 years at each
 * end at a time, at most 4 years beyond what the person chose, never below 18 and never by gender.
 */
export interface AgeRange {
  minAge: number;
  maxAge: number;
}

export interface WideningPolicy {
  /** Years added at each end per step. */
  stepYears: number;
  /** Most years beyond the chosen range at each end. 0 turns widening off. */
  maxYears: number;
  /** Absolute limits of any audience (18 and the oldest allowed age). */
  floor: number;
  ceiling: number;
}

/**
 * The next wider range after `current`, measured from the person's `chosen` range, or null when it
 * cannot widen any further. Each step widens both ends by `stepYears`, clamped to the limits.
 */
export function nextWidening(chosen: AgeRange, current: AgeRange, p: WideningPolicy): AgeRange | null {
  if (p.stepYears <= 0 || p.maxYears <= 0) return null;
  for (let years = p.stepYears; years <= p.maxYears; years += p.stepYears) {
    const next = {
      minAge: Math.max(p.floor, chosen.minAge - years),
      maxAge: Math.min(p.ceiling, chosen.maxAge + years),
    };
    if (next.minAge < current.minAge || next.maxAge > current.maxAge) {
      return { minAge: Math.min(next.minAge, current.minAge), maxAge: Math.max(next.maxAge, current.maxAge) };
    }
  }
  return null;
}

/** True when the pool of people who could fill a set slot is too small (a set of 1 or none). */
export function needsWidening(poolSize: number, partialAt: number): boolean {
  return poolSize < partialAt;
}
