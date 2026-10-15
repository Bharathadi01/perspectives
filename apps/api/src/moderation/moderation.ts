import { Global, Injectable, Module } from '@nestjs/common';

export interface ModerationVerdict {
  allowed: boolean;
  /** Internal reason; never shown to other users or logged with the content. */
  reason?: string;
}

/**
 * Text moderation boundary. Runs before delivery for perspectives, prompts, and messages.
 * Model output is untrusted: callers only act on `allowed`.
 */
export abstract class TextModerator {
  abstract check(text: string): Promise<ModerationVerdict>;
}

/**
 * STUB: a tiny phrase list so the "moderation failed" path exists end to end. Replace with the
 * real moderation provider (docs/SECURITY.md). Honest criticism must stay allowed; this list only
 * targets clear abuse, sexual solicitation, and self-harm encouragement.
 */
const BLOCKED_PHRASES = ['kill yourself', 'kys', 'send nudes', 'send me nudes', 'nude pics', 'go die'];

@Injectable()
export class StubTextModerator extends TextModerator {
  async check(text: string): Promise<ModerationVerdict> {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    const hit = BLOCKED_PHRASES.find((p) => new RegExp(`(^|\\W)${p}(\\W|$)`).test(normalized));
    return hit ? { allowed: false, reason: 'blocked_phrase' } : { allowed: true };
  }
}

/** Selfie verification boundary (liveness and face match in production). */
export abstract class SelfieVerifier {
  abstract verify(input: { userId: string; mediaId: string }): Promise<'verified' | 'rejected'>;
}

/** STUB: approves any uploaded selfie photo. Replace with a real liveness/face-match provider. */
@Injectable()
export class StubSelfieVerifier extends SelfieVerifier {
  async verify(): Promise<'verified' | 'rejected'> {
    return 'verified';
  }
}

@Global()
@Module({
  providers: [
    { provide: TextModerator, useClass: StubTextModerator },
    { provide: SelfieVerifier, useClass: StubSelfieVerifier },
  ],
  exports: [TextModerator, SelfieVerifier],
})
export class ModerationModule {}
