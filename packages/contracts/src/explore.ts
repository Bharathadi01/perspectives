import { z } from 'zod';
import { DayKeySchema, IdSchema } from './common';
import { PublicProfileSchema } from './profile';

/** Progress on today's mandatory give-to-get set. */
export const DailyStatusSchema = z.object({
  dayKey: DayKeySchema,
  /** How many perspectives must be given today (fewer when few eligible profiles exist). */
  requiredCount: z.number().int().min(0),
  givenCount: z.number().int().min(0),
  unlocked: z.boolean(),
});
export type DailyStatus = z.infer<typeof DailyStatusSchema>;

/** boost = low-response profile slot; mandatory = relevance slot; optional = after the set is done. */
export const ExploreSlot = z.enum(['mandatory', 'boost', 'optional']);
export type ExploreSlot = z.infer<typeof ExploreSlot>;

export const MatchReasonSchema = z.object({
  kind: z.enum(['shared_interest', 'dating_intention', 'category_resonance', 'lifestyle']),
  text: z.string(),
});
export type MatchReason = z.infer<typeof MatchReasonSchema>;

export const ExploreCardSchema = z.object({
  profile: PublicProfileSchema,
  slot: ExploreSlot,
  /** Posts on this profile the viewer has already given a perspective on. */
  givenPostIds: z.array(IdSchema),
  compatibilityScore: z.number().min(0).max(1).optional(),
  matchReasons: z.array(MatchReasonSchema).optional(),
});
export type ExploreCard = z.infer<typeof ExploreCardSchema>;

export const ExploreResponseSchema = z.object({
  daily: DailyStatusSchema,
  card: ExploreCardSchema.nullable(),
  /** Profiles left in today's finite batch, including the current card. */
  remainingInBatch: z.number().int().min(0),
});
export type ExploreResponse = z.infer<typeof ExploreResponseSchema>;

export const SkipProfileInputSchema = z.object({ profileId: IdSchema });
export type SkipProfileInput = z.infer<typeof SkipProfileInputSchema>;
