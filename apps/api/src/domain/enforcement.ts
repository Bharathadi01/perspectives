import type { NotHelpfulReason, ReportReason } from '@perspective/contracts';
import { SERIOUS_REPORT_REASONS } from '@perspective/contracts';

/**
 * Reports, holds, bans and the weak-giver quality loop (docs/PRODUCT.md → Reports, holds and bans,
 * decided 2026-10-20 and 2026-10-21). The system only holds; every ban is an admin decision.
 */

export type HoldReason = 'reporters' | 'serious_report';

/**
 * Whether a person should be put on hold: one credible serious report (from a verified account that
 * is not itself on hold or banned), or `holdAt` different reporters in the report window.
 */
export function holdReason(distinctReporters: number, credibleSerious: boolean, holdAt: number): HoldReason | null {
  if (credibleSerious) return 'serious_report';
  if (holdAt > 0 && distinctReporters >= holdAt) return 'reporters';
  return null;
}

export function isSeriousReason(reason: ReportReason): boolean {
  return SERIOUS_REPORT_REASONS.includes(reason);
}

/** "Not helpful" reasons about effort; only these count toward the weak-giver line. */
export const LOW_EFFORT_REASONS: readonly NotHelpfulReason[] = ['vague', 'irrelevant', 'spam'];

/**
 * A "not helpful" mark that counts as a report on the giver (decided 2026-10-21): insulting counts as
 * one report, sexual and unsafe as serious reports. Low-effort reasons never become reports.
 */
export function reportReasonForMark(reason: NotHelpfulReason): ReportReason | null {
  switch (reason) {
    case 'insulting':
      return 'body_shaming';
    case 'sexual':
      return 'nudity_sexual';
    case 'unsafe':
      return 'threat_violence';
    default:
      return null;
  }
}

export interface QualityPolicy {
  /** Marks older than this many days no longer count (marks fade). */
  fadeDays: number;
  /** The fixed line: weak when more than this share of (low-effort + helpful) marks are low-effort. */
  line: number;
  /** Judged only with at least this many low-effort marks ... */
  minLowEffort: number;
  /** ... from at least this many different people. */
  minMarkers: number;
  /** An owner who marked more than this share of what they received as not helpful ... */
  harshShare: number;
  /** ... with at least this many marks, counts at `harshWeight`. */
  harshMinMarks: number;
  harshWeight: number;
  /** Second step: this many more low-effort marks since the tip, from `minMarkers` people, while still weak. */
  flagMoreMarks: number;
}

export const DEFAULT_QUALITY_POLICY: QualityPolicy = {
  fadeDays: 45,
  line: 0.6,
  minLowEffort: 8,
  minMarkers: 5,
  harshShare: 0.8,
  harshMinMarks: 10,
  harshWeight: 0.5,
  flagMoreMarks: 10,
};

export interface QualityMark {
  /** The owner who marked the perspective. */
  markerId: string;
  kind: 'helpful' | 'low_effort';
  at: Date;
}

/** An owner who marks almost everything they receive as not helpful counts for less. */
export function isHarshMarker(notHelpful: number, totalMarks: number, p: QualityPolicy = DEFAULT_QUALITY_POLICY): boolean {
  return totalMarks >= p.harshMinMarks && notHelpful / totalMarks > p.harshShare;
}

export interface GiverAssessment {
  weak: boolean;
  /** Low-effort marks inside the fade window (not weighted). */
  lowEffort: number;
  helpful: number;
  /** Different people behind those low-effort marks. */
  lowEffortMarkers: number;
  /** Weighted low-effort share; 0 when there are no marks. */
  share: number;
}

export function assessGiver(
  marks: readonly QualityMark[],
  harshMarkers: ReadonlySet<string>,
  now: Date,
  p: QualityPolicy = DEFAULT_QUALITY_POLICY,
): GiverAssessment {
  const since = now.getTime() - p.fadeDays * 86400000;
  const live = marks.filter((m) => m.at.getTime() >= since);
  const weight = (m: QualityMark) => (harshMarkers.has(m.markerId) ? p.harshWeight : 1);
  const low = live.filter((m) => m.kind === 'low_effort');
  const helpful = live.filter((m) => m.kind === 'helpful');
  const lowWeight = low.reduce((sum, m) => sum + weight(m), 0);
  const helpfulWeight = helpful.reduce((sum, m) => sum + weight(m), 0);
  const share = lowWeight + helpfulWeight === 0 ? 0 : lowWeight / (lowWeight + helpfulWeight);
  const lowEffortMarkers = new Set(low.map((m) => m.markerId)).size;
  const judged = low.length >= p.minLowEffort && lowEffortMarkers >= p.minMarkers;
  return { weak: judged && share > p.line, lowEffort: low.length, helpful: helpful.length, lowEffortMarkers, share };
}

/** Second step: enough new low-effort marks since the tip, from enough people, while still weak. */
export function shouldFlagWeakGiver(
  marks: readonly QualityMark[],
  weakSince: Date,
  stillWeak: boolean,
  p: QualityPolicy = DEFAULT_QUALITY_POLICY,
): boolean {
  if (!stillWeak) return false;
  const after = marks.filter((m) => m.kind === 'low_effort' && m.at.getTime() > weakSince.getTime());
  return after.length >= p.flagMoreMarks && new Set(after.map((m) => m.markerId)).size >= p.minMarkers;
}

export type AccountState = 'active' | 'suspended' | 'banned';

/** A ban is in force: permanent, or temporary and not yet over. */
export function isRestricted(status: AccountState, suspendedUntil: Date | null, now: Date): boolean {
  if (status === 'banned') return true;
  return status === 'suspended' && (suspendedUntil === null || suspendedUntil.getTime() > now.getTime());
}

/** A temporary ban whose end has passed: the account returns to active by itself. */
export function suspensionOver(status: AccountState, suspendedUntil: Date | null, now: Date): boolean {
  return status === 'suspended' && suspendedUntil !== null && suspendedUntil.getTime() <= now.getTime();
}

/** End of a new temporary ban. */
export function banEndsAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86400000);
}

/** Extending adds `days` to the current end (or to now, if it already passed). Decided 2026-10-21: 3 days. */
export function extendedEnd(currentEnd: Date | null, now: Date, days: number): Date {
  const from = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return new Date(from.getTime() + days * 86400000);
}
