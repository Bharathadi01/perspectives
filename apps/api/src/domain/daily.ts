import type { DailyStatus } from '@perspective/contracts';

/**
 * Pool-size thresholds (docs/PRODUCT.md, decided 2026-10-20). With at least `full` people available
 * the user gets the most; with at least `partial` a little less; below that, fewer still.
 */
export interface PoolThresholds {
  full: number;
  partial: number;
}

export const DEFAULT_POOL_THRESHOLDS: PoolThresholds = { full: 15, partial: 6 };

/**
 * How many perspectives a user must give today before unlocking their own, from how many people
 * could fill a set slot for them right now: 3 at 15 or more, 2 at 6 to 14, 1 at 1 to 5, 0 when
 * nobody is available (they are unlocked straight away). Never more than `max`.
 */
export function mandatoryCount(available: number, max = 3, t: PoolThresholds = DEFAULT_POOL_THRESHOLDS): number {
  if (available <= 0 || max <= 0) return 0;
  const count = available >= t.full ? 3 : available >= t.partial ? 2 : 1;
  return Math.min(count, max, available);
}

/**
 * How many more profiles a free user gets after the mandatory set, from how many eligible people are
 * left for them that day: 5 at 15 or more, 4 at 6 to 14, and below that as many as are left, up to 3.
 */
export function bonusCount(available: number, t: PoolThresholds = DEFAULT_POOL_THRESHOLDS): number {
  if (available <= 0) return 0;
  if (available >= t.full) return 5;
  if (available >= t.partial) return 4;
  return Math.min(available, 3);
}

export function dailyStatus(dayKey: string, requiredCount: number, givenCount: number): DailyStatus {
  return { dayKey, requiredCount, givenCount, unlocked: givenCount >= requiredCount };
}

/**
 * A received item (perspective or connect request) is revealed once its owner has completed the
 * daily set on the day it arrived or any later day. Items that arrive after today's unlock are
 * visible straight away.
 */
export function isRevealed(receivedDayKey: string, latestUnlockedDayKey: string | null): boolean {
  return latestUnlockedDayKey !== null && receivedDayKey <= latestUnlockedDayKey;
}

/**
 * When a mandatory slot is skipped (or its profile becomes ineligible) and no replacement exists,
 * the day's requirement shrinks by one, but never below what was already given.
 */
export function requiredAfterUnfilledSlot(requiredCount: number, givenCount: number): number {
  return Math.max(givenCount, requiredCount - 1);
}
