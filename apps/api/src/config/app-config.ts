import { z } from 'zod';

/** Empty string or unset means "no cap" (product decision: caps default to unlimited). */
const OptionalCap = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? null : Number(v)))
  .pipe(z.number().int().positive().nullable());

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
  /** Mandatory perspectives per day (product default 3). */
  DAILY_MANDATORY_COUNT: z.coerce.number().int().min(0).default(3),
  /** assumption: finite daily Explore batch size, including the mandatory set */
  DAILY_BATCH_SIZE: z.coerce.number().int().min(1).default(10),
  /** Days before the same sender can re-request after a decline (product default 14; 0 disables). */
  CONNECT_DECLINE_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(14),
  MAX_CONNECT_REQUESTS_PER_DAY: OptionalCap,
  MAX_PERSPECTIVES_RECEIVED_PER_DAY: OptionalCap,
  /** assumption: how long a skipped profile stays out of Explore */
  SKIP_HIDE_DAYS: z.coerce.number().int().min(0).default(7),
  /** Window used to find low-response profiles for the boost slot. */
  BOOST_LOOKBACK_DAYS: z.coerce.number().int().min(1).default(7),
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
