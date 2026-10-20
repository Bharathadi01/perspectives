import { z } from 'zod';

/** An empty string means "no cap". Unset uses `fallback` (null = no cap). */
const optionalCap = (fallback: number | null) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? fallback : v.trim() === '' ? null : Number(v)))
    .pipe(z.number().int().positive().nullable());

const weight = (fallback: number) => z.coerce.number().min(0).max(1).default(fallback);

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MEDIA_SIGNING_SECRET: z.string().min(32),
  MEDIA_STORAGE_DIR: z.string().default('./.data/media'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  MEDIA_URL_TTL_SEC: z.coerce.number().int().positive().default(3600),
  /** Timezone that defines "today" for the daily give-to-get set. assumption: Asia/Kolkata */
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  /** Most mandatory perspectives per day. The actual count is 1, 2 or 3 by pool size (decided 2026-10-20). */
  DAILY_MANDATORY_COUNT: z.coerce.number().int().min(0).default(3),
  /** People available for a set at which the daily set is full (3) and the after-set gets 5 (decided 2026-10-20). */
  POOL_FULL_AT: z.coerce.number().int().min(1).default(15),
  /** People available at which the daily set is 2 and the after-set gets 4; below it, fewer. */
  POOL_PARTIAL_AT: z.coerce.number().int().min(1).default(6),
  /** Automatic age widening when fewer than POOL_PARTIAL_AT people are available: years added at each end per step. */
  AUDIENCE_WIDEN_STEP_YEARS: z.coerce.number().int().min(1).default(2),
  /** Most years the age range may widen beyond the chosen range at each end (decided 2026-10-20; 0 turns widening off). */
  AUDIENCE_WIDEN_MAX_YEARS: z.coerce.number().int().min(0).default(4),
  /** Days before the same sender can re-request after a decline (product default 14; 0 disables). */
  CONNECT_DECLINE_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(14),
  /** Connect requests a person may send per day (beta value 5, decided 2026-10-20). Empty = no cap. */
  MAX_CONNECT_REQUESTS_PER_DAY: optionalCap(5),
  /** Optional hard cap on perspectives one profile can receive per day. Unset: none (the product has no hard cap). */
  MAX_PERSPECTIVES_RECEIVED_PER_DAY: optionalCap(null),
  /** Soft limit: after this many perspectives received today, a person is put into no more mandatory sets (0 = off). */
  RECEIVED_SOFT_LIMIT_PER_DAY: z.coerce.number().int().min(0).default(10),
  /** People who have not opened the app for this many days are never put into a mandatory set (0 = off). */
  MANDATORY_INACTIVE_DAYS: z.coerce.number().int().min(0).default(7),
  /** How long a skipped profile stays out of Explore (decided 2026-10-20: 2 days for the beta). */
  SKIP_HIDE_DAYS: z.coerce.number().int().min(0).default(2),
  /** "Recently" for the boost (no perspectives in this many days) and for need in the ranking (decided 2026-10-20: 3). */
  BOOST_LOOKBACK_DAYS: z.coerce.number().int().min(1).default(3),
  /** Over-exposure (2026-10-19): most mandatory slots one profile may hold per day across all viewers (0 = no cap). */
  MAX_MANDATORY_ASSIGNMENTS_PER_PROFILE_PER_DAY: z.coerce.number().int().min(0).default(6),
  /** The boost is picked at random from this many of the least-served profiles (1 = always the single least-served). */
  BOOST_CANDIDATE_POOL: z.coerce.number().int().min(1).default(5),
  /** The boost only goes to owners who opened the app today or in this many days before (0 = no activity check). */
  BOOST_ACTIVE_DAYS: z.coerce.number().int().min(0).default(3),
  /** Profiles younger than this can take the boost slot even before their owner's activity is known. */
  BOOST_NEW_PROFILE_HOURS: z.coerce.number().min(0).default(48),
  /** Window for counting distinct people who reported a profile. */
  REPORT_LOOKBACK_DAYS: z.coerce.number().int().min(1).default(30),
  /** Distinct recent reporters that keep a profile out of every mandatory slot (0 turns this off). */
  REPORT_PAUSE_REPORTERS: z.coerce.number().int().min(0).default(2),
  /** Distinct recent reporters that put a person on hold: hidden from new people, on the admin's list (0 = off). */
  REPORT_HOLD_REPORTERS: z.coerce.number().int().min(0).default(3),
  /** Length of a temporary ban, and of each extension (decided 2026-10-21: 3 days). */
  BAN_TEMPORARY_DAYS: z.coerce.number().int().min(1).default(3),
  /** Weak-giver line (decided 2026-10-21): weak above this share of low-effort marks. */
  WEAK_GIVER_LINE: weight(0.6),
  /** Judged only with this many low-effort marks ... */
  WEAK_GIVER_MIN_MARKS: z.coerce.number().int().min(1).default(8),
  /** ... from this many different people (also for the admin flag). */
  WEAK_GIVER_MIN_MARKERS: z.coerce.number().int().min(1).default(5),
  /** More low-effort marks after the tip that put a still-weak giver on the admin's list. */
  WEAK_GIVER_FLAG_MARKS: z.coerce.number().int().min(1).default(10),
  /** Ranking penalty while someone is a weak giver (decided 2026-10-21: the same as 2 reporters). */
  WEAK_GIVER_PENALTY: weight(0.2),
  /** Marks older than this no longer count. */
  MARK_FADE_DAYS: z.coerce.number().int().min(1).default(45),
  /** An owner who marked more than this share of what they received as not helpful counts half ... */
  HARSH_MARKER_SHARE: weight(0.8),
  /** ... once they marked at least this many. */
  HARSH_MARKER_MIN_MARKS: z.coerce.number().int().min(1).default(10),
  /**
   * Whether admin sign-in needs the 6-digit authenticator code (ADR-019). Off for now by the product
   * owner's decision (2026-10-21): password only during development. Turn on before the beta.
   */
  ADMIN_REQUIRE_CODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** Admin sessions are short and cannot be renewed (docs/SECURITY.md). */
  ADMIN_SESSION_HOURS: z.coerce.number().positive().max(24).default(8),
  /** Optional separate secret for admin tokens; without it one is derived from JWT_ACCESS_SECRET. */
  ADMIN_JWT_SECRET: z.string().min(32).optional(),
  /** Ranking weights (decided 2026-10-20). */
  RANK_WEIGHT_INTERESTS: weight(0.45),
  RANK_WEIGHT_NEED: weight(0.2),
  RANK_WEIGHT_ACTIVE: weight(0.15),
  RANK_WEIGHT_NEW_MEMBER: weight(0.1),
  RANK_WEIGHT_QUALITY: weight(0.1),
  /** Head start for people the viewer never gave a perspective to (decided 2026-10-20). */
  RANK_WEIGHT_FRESH: weight(0.1),
  /** Quiet connections (product decision 2026-10-18): hours after the quiet person opens the chat. */
  FIRST_REPLY_WARN_HOURS: z.coerce.number().positive().default(24),
  FIRST_REPLY_CLOSE_HOURS: z.coerce.number().positive().default(48),
  /** Closes an unanswered first message even if the other person never opens the chat. */
  FIRST_REPLY_BACKSTOP_DAYS: z.coerce.number().positive().default(7),
  NO_MESSAGE_REMIND_DAYS: z.coerce.number().positive().default(2),
  NO_MESSAGE_CLOSE_DAYS: z.coerce.number().positive().default(3),
  /** Once both have written, close after this many days with no messages. */
  INACTIVITY_CLOSE_DAYS: z.coerce.number().positive().default(14),
  /** Days before a pair whose connection closed on its own can connect again (0 = straight away, like an unmatch). */
  REOPEN_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(0),
  /** How often to close quiet connections nobody is looking at (0 disables the sweep). */
  EXPIRY_SWEEP_MINUTES: z.coerce.number().int().min(0).default(15),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API configuration: ${problems}`);
  }
  return parsed.data;
}
