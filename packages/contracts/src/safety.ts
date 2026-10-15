import { z } from 'zod';
import { IdSchema } from './common';

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
