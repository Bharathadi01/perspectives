import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, RULES } from './common';
import { ErrorCode } from './error';
import { DailyStatusSchema } from './explore';
import { PostRefSchema } from './post';
import { ProfileSummarySchema } from './profile';

export const PerspectiveStatus = z.enum([
  'submitted',
  'pending_moderation',
  'delivered',
  'helpful',
  'archived',
  'reported',
  'removed',
]);
export type PerspectiveStatus = z.infer<typeof PerspectiveStatus>;

export const NotHelpfulReason = z.enum(['vague', 'irrelevant', 'insulting', 'sexual', 'spam', 'unsafe']);
export type NotHelpfulReason = z.infer<typeof NotHelpfulReason>;

export const GivePerspectiveInputSchema = z.object({
  postId: IdSchema,
  comment: z.string().trim().min(RULES.commentMinLength).max(RULES.commentMaxLength),
  chips: z
    .array(z.string())
    .max(RULES.maxChips)
    .default([])
    .refine((c) => new Set(c).size === c.length, 'Chips must be unique'),
  /** Also send a connect request to the post owner. */
  connect: z.boolean().default(false),
});
export type GivePerspectiveInput = z.input<typeof GivePerspectiveInputSchema>;
export type GivePerspectiveParsed = z.output<typeof GivePerspectiveInputSchema>;

/** A perspective as its giver sees it. Givers never see the owner's helpful/not-helpful verdict. */
export const GivenPerspectiveSchema = z.object({
  id: IdSchema,
  post: PostRefSchema,
  owner: ProfileSummarySchema,
  comment: z.string(),
  chips: z.array(z.string()),
  thanked: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type GivenPerspective = z.infer<typeof GivenPerspectiveSchema>;

export const PerspectiveFeedbackSchema = z.object({
  verdict: z.enum(['helpful', 'not_helpful']),
  reason: NotHelpfulReason.nullable(),
  thanked: z.boolean(),
});
export type PerspectiveFeedback = z.infer<typeof PerspectiveFeedbackSchema>;

/** A perspective as the post owner sees it in the Inbox. */
export const ReceivedPerspectiveSchema = z.object({
  id: IdSchema,
  post: PostRefSchema,
  giver: ProfileSummarySchema,
  comment: z.string(),
  chips: z.array(z.string()),
  feedback: PerspectiveFeedbackSchema.nullable(),
  /** Set when the giver ticked Connect and the request is still pending. */
  pendingConnectRequestId: IdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type ReceivedPerspective = z.infer<typeof ReceivedPerspectiveSchema>;

export const ConnectAttemptSchema = z.union([
  z.object({ status: z.literal('sent'), requestId: IdSchema }),
  /** The giver ticked Connect while the other person already had a request waiting: it was accepted. */
  z.object({ status: z.literal('connected'), connectionId: IdSchema }),
  z.object({ status: z.literal('not_sent'), code: ErrorCode }),
]);
export type ConnectAttempt = z.infer<typeof ConnectAttemptSchema>;

export const GivePerspectiveResultSchema = z.object({
  perspective: GivenPerspectiveSchema,
  daily: DailyStatusSchema,
  /** Null when the giver did not tick Connect. */
  connect: ConnectAttemptSchema.nullable(),
});
export type GivePerspectiveResult = z.infer<typeof GivePerspectiveResultSchema>;

export const PerspectiveFeedbackInputSchema = z
  .object({
    verdict: z.enum(['helpful', 'not_helpful']),
    reason: NotHelpfulReason.optional(),
    thankPrivately: z.boolean().default(false),
  })
  .refine((v) => v.verdict !== 'not_helpful' || v.reason !== undefined, {
    message: 'Pick a reason',
    path: ['reason'],
  })
  .refine((v) => v.verdict === 'helpful' || !v.thankPrivately, {
    message: 'Only helpful perspectives can be thanked',
    path: ['thankPrivately'],
  });
export type PerspectiveFeedbackInput = z.input<typeof PerspectiveFeedbackInputSchema>;
