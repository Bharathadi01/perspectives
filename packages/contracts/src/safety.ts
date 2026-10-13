import { z } from 'zod';

export const ReportReason = z.enum([
  'sexual_content',
  'harassment_hate',
  'threat_violence',
  'self_harm',
  'scam_impersonation',
  'doxxing_privacy',
  'minor_context',
  'spam_irrelevant',
  'other',
]);
export type ReportReason = z.infer<typeof ReportReason>;

export const CreateReportInputSchema = z.object({
  targetType: z.enum(['request', 'response', 'message', 'user']),
  targetId: z.string(),
  reason: ReportReason,
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid(),
});
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;

export const BlockUserInputSchema = z.object({
  blockedUserId: z.string(),
  idempotencyKey: z.string().uuid(),
});
export type BlockUserInput = z.infer<typeof BlockUserInputSchema>;

export const DeleteAccountInputSchema = z.object({
  confirmationPhrase: z.literal('DELETE MY ACCOUNT'),
  reason: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid(),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
