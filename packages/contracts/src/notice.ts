import { z } from 'zod';
import { IdSchema } from './common';

/**
 * In-app notices (decided 2026-10-20), listed under You → Notices: the age range was widened, a
 * private tip for weak givers, and an account restored after a ban.
 */
export const AudienceWidenedNoticeSchema = z.object({
  id: IdSchema,
  kind: z.literal('audience_widened'),
  createdAt: z.string(),
  read: z.boolean(),
  /** The new range in use. */
  minAge: z.number().int(),
  maxAge: z.number().int(),
  /** The range the person chose. */
  chosenMinAge: z.number().int(),
  chosenMaxAge: z.number().int(),
});
export type AudienceWidenedNotice = z.infer<typeof AudienceWidenedNoticeSchema>;

/** The quality loop's first step: a private tip, with no names and no numbers. */
export const WeakGiverTipNoticeSchema = z.object({
  id: IdSchema,
  kind: z.literal('weak_giver_tip'),
  createdAt: z.string(),
  read: z.boolean(),
});

/** A ban was lifted (after an appeal or by an admin). */
export const AccountRestoredNoticeSchema = z.object({
  id: IdSchema,
  kind: z.literal('account_restored'),
  createdAt: z.string(),
  read: z.boolean(),
  /** The admin's reason, shown as written. */
  reason: z.string(),
});

export const NoticeSchema = z.discriminatedUnion('kind', [
  AudienceWidenedNoticeSchema,
  WeakGiverTipNoticeSchema,
  AccountRestoredNoticeSchema,
]);
export type Notice = z.infer<typeof NoticeSchema>;

export const NoticesSchema = z.object({
  notices: z.array(NoticeSchema),
  unreadCount: z.number().int().min(0),
});
export type Notices = z.infer<typeof NoticesSchema>;
