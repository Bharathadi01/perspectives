import { z } from 'zod';

export const ErrorCode = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'IDEMPOTENCY_KEY_REQUIRED',
  'CONFLICT',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'UNDERAGE',
  'ACCOUNT_SUSPENDED',
  'PROFILE_INCOMPLETE',
  'SELFIE_VERIFICATION_REQUIRED',
  'PRIMARY_POST_REQUIRED',
  'POST_LIMIT_REACHED',
  'POST_NOT_ELIGIBLE',
  'PROFILE_NOT_ELIGIBLE',
  'BLOCKED_PAIR',
  'ALREADY_SUBMITTED',
  'PERSPECTIVE_REQUIRED_BEFORE_CONNECT',
  'CONNECT_COOLDOWN_ACTIVE',
  'CONNECT_REQUEST_PENDING',
  'ALREADY_CONNECTED',
  'CONNECTION_CLOSED',
  'CAP_REACHED',
  'DAILY_UNLOCK_INCOMPLETE',
  'MODERATION_FAILED',
  'MEDIA_INVALID',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
