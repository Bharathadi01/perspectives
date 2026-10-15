import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { APP_CONFIG, AppConfig } from '../config/app-config';

/**
 * Short-lived signed media paths. URLs are only placed in DTOs for viewers allowed to see the
 * post; there are no permanent public download URLs. Paths are relative to the API base URL.
 */
@Injectable()
export class MediaUrlSigner {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  sign(mediaId: string, now: Date = new Date()): string {
    const exp = Math.floor(now.getTime() / 1000) + this.config.MEDIA_URL_TTL_SEC;
    return `/v1/media/${mediaId}/content?exp=${exp}&sig=${this.signature(mediaId, exp)}`;
  }

  verify(mediaId: string, exp: string, sig: string, now: Date = new Date()): boolean {
    const expNum = Number(exp);
    if (!Number.isInteger(expNum) || expNum < Math.floor(now.getTime() / 1000)) return false;
    const expected = Buffer.from(this.signature(mediaId, expNum));
    const actual = Buffer.from(sig ?? '');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private signature(mediaId: string, exp: number): string {
    return createHmac('sha256', this.config.MEDIA_SIGNING_SECRET).update(`${mediaId}.${exp}`).digest('base64url');
  }
}
