import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (existsSync('.env')) process.loadEnvFile('.env');

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://perspective:perspective@localhost:5432/perspective_test?schema=public';
process.env.MEDIA_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'perspective-media-'));
process.env.DAILY_MANDATORY_COUNT = '3';
process.env.CONNECT_DECLINE_COOLDOWN_DAYS = '14';
process.env.MAX_CONNECT_REQUESTS_PER_DAY = '';
process.env.MAX_PERSPECTIVES_RECEIVED_PER_DAY = '';
process.env.RECEIVED_SOFT_LIMIT_PER_DAY = '10';
process.env.MANDATORY_INACTIVE_DAYS = '7';
process.env.POOL_FULL_AT = '15';
process.env.POOL_PARTIAL_AT = '6';
process.env.EXPIRY_SWEEP_MINUTES = '0';
// Pushes are recorded, never sent to Expo, in tests.
process.env.PUSH_SENDER = 'log';
process.env.REOPEN_COOLDOWN_DAYS = '0';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret-at-least-32-chars-long-1234';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-secret-at-least-32-chars-long-5678';
process.env.MEDIA_SIGNING_SECRET = process.env.MEDIA_SIGNING_SECRET ?? 'test-secret-at-least-32-chars-long-9012';

