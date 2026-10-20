import { z } from 'zod';
import { IdSchema } from './common';
import { ReportReason, ReportTargetType } from './safety';

/**
 * The admin dashboard API (docs/SECURITY.md → Admin access and enforcement). Admin identities are
 * separate from Perspective accounts and use their own token on /v1/admin only.
 */

export const AdminLoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  /** 6-digit code from the authenticator app; needed only while the server requires codes. */
  code: z
    .string()
    .trim()
    .regex(/^(\d{6})?$/, 'Enter the 6-digit code from your authenticator app')
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type AdminLoginInput = z.infer<typeof AdminLoginInputSchema>;

export const AdminSessionSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  email: z.string(),
});
export type AdminSession = z.infer<typeof AdminSessionSchema>;

export const AdminQueueReason = z.enum(['serious_report', 'appeal', 'reporters', 'weak_giver']);
export type AdminQueueReason = z.infer<typeof AdminQueueReason>;

export const AccountStatus = z.enum(['active', 'suspended', 'banned']);
export type AccountStatus = z.infer<typeof AccountStatus>;

export const AdminQueueItemSchema = z.object({
  userId: IdSchema,
  displayName: z.string(),
  reason: AdminQueueReason,
  status: AccountStatus,
  /** True while they are hidden from new people (a hold). */
  hidden: z.boolean(),
  since: z.string(),
  distinctReporters: z.number().int(),
});
export type AdminQueueItem = z.infer<typeof AdminQueueItemSchema>;

export const AdminReportSchema = z.object({
  id: IdSchema,
  reason: ReportReason,
  note: z.string().nullable(),
  targetType: ReportTargetType,
  fromFeedback: z.boolean(),
  status: z.enum(['unreviewed', 'human_review', 'allowed', 'removed']),
  createdAt: z.string(),
  /** A short stable label for the reporter (never their identity), so repeat reporters are visible. */
  reporterLabel: z.string(),
  /** The reported content: text and/or a short-lived media link. */
  content: z.object({
    text: z.string().nullable(),
    prompt: z.string().nullable(),
    mediaUrl: z.string().nullable(),
    missing: z.boolean(),
  }),
});
export type AdminReport = z.infer<typeof AdminReportSchema>;

export const AdminCaseSchema = z.object({
  person: z.object({
    id: IdSchema,
    displayName: z.string(),
    email: z.string(),
    age: z.number().int(),
    status: AccountStatus,
    suspendedUntil: z.string().nullable(),
    joinedAt: z.string(),
    primaryPhotoUrl: z.string().nullable(),
  }),
  openCases: z.array(
    z.object({ id: IdSchema, reason: z.enum(['reporters', 'serious_report', 'weak_giver']), hides: z.boolean(), openedAt: z.string() }),
  ),
  distinctReporters: z.number().int(),
  reports: z.array(AdminReportSchema),
  quality: z.object({
    weak: z.boolean(),
    lowEffortMarks: z.number().int(),
    helpfulMarks: z.number().int(),
    weakSince: z.string().nullable(),
    flagged: z.boolean(),
  }),
  bans: z.array(
    z.object({
      id: IdSchema,
      kind: z.enum(['temporary', 'permanent']),
      reason: z.string(),
      createdAt: z.string(),
      endsAt: z.string().nullable(),
      liftedAt: z.string().nullable(),
      appeal: z
        .object({
          id: IdSchema,
          status: z.enum(['open', 'upheld', 'restored']),
          message: z.string(),
          createdAt: z.string(),
          decisionReason: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  history: z.array(z.object({ action: z.string(), admin: z.string(), reason: z.string().nullable(), createdAt: z.string() })),
});
export type AdminCase = z.infer<typeof AdminCaseSchema>;

/** Every admin action needs a reason; ban reasons are shown to the person. */
export const ADMIN_REASON_MIN = 5;
export const ADMIN_REASON_MAX = 500;
const AdminReason = z.string().trim().min(ADMIN_REASON_MIN).max(ADMIN_REASON_MAX);

export const AdminAction = z.enum(['dismiss', 'ban_temporary', 'ban_permanent', 'extend', 'restore']);
export type AdminAction = z.infer<typeof AdminAction>;

export const AdminActionInputSchema = z.object({ action: AdminAction, reason: AdminReason });
export type AdminActionInput = z.infer<typeof AdminActionInputSchema>;

export const AppealDecisionInputSchema = z.object({ decision: z.enum(['uphold', 'restore']), reason: AdminReason });
export type AppealDecisionInput = z.infer<typeof AppealDecisionInputSchema>;
