import { z } from 'zod';

export const ErrorCode = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'REQUEST_NOT_ELIGIBLE',
  'BLOCKED_PAIR',
  'MUTUAL_INTENT_REQUIRED',
  'ALREADY_SUBMITTED',
  'MODERATION_FAILED',
  'RATE_LIMITED',
  'INVALID_IMPRESSION_TOKEN',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
    details: z.any().nullable().optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
