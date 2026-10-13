import { z } from 'zod';
import { PerspectiveRequestSchema } from './request';

export const ExploreBatchSchema = z.object({
  requests: z.array(PerspectiveRequestSchema),
  impressionToken: z.string(),
  dailyBatchCount: z.number().int(),
  dailyBatchTotal: z.number().int(),
  dailyHeadline: z.string(), // e.g. "8 thoughtful requests today"
});
export type ExploreBatch = z.infer<typeof ExploreBatchSchema>;

export const SkipRequestInputSchema = z.object({
  requestId: z.string(),
  reason: z.enum(['not_interested', 'wrong_category', 'not_qualified', 'other']).optional(),
  idempotencyKey: z.string().uuid(),
});
export type SkipRequestInput = z.infer<typeof SkipRequestInputSchema>;
