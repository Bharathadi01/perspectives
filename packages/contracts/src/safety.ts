import { z } from 'zod';
import { IdSchema } from './common';
import { ProfileSummarySchema } from './profile';

export const ReportTargetType = z.enum(['profile', 'post', 'perspective', 'message']);
export type ReportTargetType = z.infer<typeof ReportTargetType>;

export const ReportReason = z.enum([
  'nudity_sexual',
  'body_shaming',
  'harassment_hate',
  'threat_violence',
  'self_harm',
  'scam_impersonation',
  'underage',
  'spam',
  'other',
]);
export type ReportReason = z.infer<typeof ReportReason>;

export const CreateReportInputSchema = z.object({
  targetType: ReportTargetType,
  targetId: IdSchema,
  reason: ReportReason,
  note: z.string().trim().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;

export const DELETE_ACCOUNT_PHRASE = 'DELETE MY ACCOUNT';

export const DeleteAccountInputSchema = z.object({
  /** Recent authentication is required for deletion. */
  password: z.string().min(1),
  confirmationPhrase: z.literal(DELETE_ACCOUNT_PHRASE),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;

/**
 * Report reasons that hide the person at once and put them at the top of the admin's list
 * (decided 2026-10-20).
 */
export const SERIOUS_REPORT_REASONS: readonly ReportReason[] = ['nudity_sexual', 'threat_violence', 'underage', 'self_harm'];

/** What a suspended (temporary ban) or banned (permanent) person sees instead of the app. */
export const RestrictionSchema = z.object({
  status: z.enum(['suspended', 'banned']),
  /** The admin's reason, shown as written. */
  reason: z.string(),
  /** When a temporary ban ends; null for a permanent ban. */
  endsAt: z.string().nullable(),
  appeal: z
    .object({
      status: z.enum(['open', 'upheld', 'restored']),
      message: z.string(),
      createdAt: z.string(),
      /** Why the ban was kept, when it was. */
      decisionReason: z.string().nullable(),
    })
    .nullable(),
  /** One appeal per ban (decided 2026-10-21). */
  canAppeal: z.boolean(),
});
export type Restriction = z.infer<typeof RestrictionSchema>;

export const APPEAL_MIN_LENGTH = 10;
export const APPEAL_MAX_LENGTH = 1000;

export const AppealInputSchema = z.object({
  message: z.string().trim().min(APPEAL_MIN_LENGTH).max(APPEAL_MAX_LENGTH),
});
export type AppealInput = z.infer<typeof AppealInputSchema>;

/** Someone you blocked, for You → Blocked people (decided 2026-10-20). Only the blocker sees this list. */
export const BlockedPersonSchema = z.object({
  person: ProfileSummarySchema,
  blockedAt: z.string(),
});
export type BlockedPerson = z.infer<typeof BlockedPersonSchema>;
