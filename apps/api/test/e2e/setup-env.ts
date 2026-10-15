import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (existsSync('.env')) process.loadEnvFile('.env');

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://perspective:perspective@localhost:5432/perspective_test?schema=public';
process.env.MEDIA_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'perspective-media-'));
process.env.DAILY_MANDATORY_COUNT = '3';
process.env.DAILY_BATCH_SIZE = '10';
process.env.CONNECT_DECLINE_COOLDOWN_DAYS = '14';
process.env.MAX_CONNECT_REQUESTS_PER_DAY = '';
process.env.MAX_PERSPECTIVES_RECEIVED_PER_DAY = '';
