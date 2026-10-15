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
