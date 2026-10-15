import type { DailyStatus } from '@perspective/contracts';

/**
 * How many perspectives a user must give today before unlocking their own.
 * v1: a fixed configured count (product default 3), behind a function so it can become dynamic.
 */
export function mandatoryCount(_userId: string, configuredCount: number): number {
  return configuredCount;
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
