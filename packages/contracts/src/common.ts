import { z } from 'zod';

export const IdSchema = z.string().uuid();
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

/** A calendar date in the app timezone, `YYYY-MM-DD`. */
export const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/** Header carrying the client-generated idempotency key on every mutation. */
export const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Product rules shared by mobile and API. Business values come from docs/PRODUCT.md;
 * values marked "assumption" were not decided by the product owner and are listed in the
 * development report.
 */
export const RULES = {
  minAge: 18,
  maxAudienceAge: 99,
  minPosts: 1,
  maxPosts: 6,
  audioMaxSeconds: 15,
  /** assumption: prompt length bounds */
  promptMinLength: 5,
  promptMaxLength: 150,
  /** assumption: minimum comment length (product says "a minimum length"; 40 was the proposed default) */
  commentMinLength: 40,
  commentMaxLength: 1000,
  /** assumption: max quick-pick chips per perspective (earlier docs allowed up to three tags) */
  maxChips: 3,
  /** assumption: focus areas an owner may pick per post */
  minFocusAreas: 1,
  maxFocusAreas: 3,
  messageMaxLength: 1000,
  displayNameMaxLength: 40,
  /** assumption: plausible height range in centimetres */
  heightCmMin: 120,
  heightCmMax: 230,
  passwordMinLength: 8,
  passwordMaxLength: 128,
} as const;

/** Whole years between `birthDate` (YYYY-MM-DD) and `today`. */
export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = today.getUTCFullYear() - y;
  const monthDiff = today.getUTCMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < d)) {
    age -= 1;
  }
  return age;
}
