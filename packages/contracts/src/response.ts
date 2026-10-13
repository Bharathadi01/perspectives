import { z } from 'zod';
import { ConnectionMode, PublicProfileSchema } from './user';
import { PerspectiveRequestSchema } from './request';

export const ResponseTone = z.enum([
  'constructive',
  'direct',
  'encouraging',
  'expert',
]);
export type ResponseTone = z.infer<typeof ResponseTone>;

export const ResponseStatus = z.enum([
  'submitted',
  'pending_moderation',
  'delivered',
  'helpful',
  'archived',
  'reported',
  'removed',
]);
export type ResponseStatus = z.infer<typeof ResponseStatus>;

export const PerspectiveResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  request: PerspectiveRequestSchema.optional(),
  authorId: z.string(),
  author: PublicProfileSchema.optional(),
  firstImpression: z.string().min(2).max(150),
  reason: z.string().max(400).optional(),
  suggestion: z.string().max(300).optional(),
  tags: z.array(z.string()).max(3).default([]),
  tone: ResponseTone,
  connectionIntent: ConnectionMode.nullable().optional(),
  status: ResponseStatus,
  moderationState: z.enum(['allowed', 'pending', 'removed']),
  createdAt: z.string(),
});
export type PerspectiveResponse = z.infer<typeof PerspectiveResponseSchema>;

export const SubmitResponseInputSchema = z.object({
  requestId: z.string(),
  firstImpression: z.string().min(2).max(150),
  reason: z.string().max(400).optional(),
  suggestion: z.string().max(300).optional(),
  tags: z.array(z.string()).max(3).default([]),
  tone: ResponseTone,
  connectionIntent: ConnectionMode.nullable().optional(),
  impressionToken: z.string(),
  idempotencyKey: z.string().uuid(),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseInputSchema>;

export const ResponseFeedbackReason = z.enum([
  'vague',
  'irrelevant',
  'insulting',
  'sexual',
  'spam',
  'unsafe',
]);
export type ResponseFeedbackReason = z.infer<typeof ResponseFeedbackReason>;

export const SubmitFeedbackInputSchema = z.object({
  responseId: z.string(),
  rating: z.enum(['helpful', 'not_helpful']),
  unhelpfulReason: ResponseFeedbackReason.optional(),
  thankPrivately: z.boolean().optional(),
  connectionIntent: ConnectionMode.optional(),
  idempotencyKey: z.string().uuid(),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;
