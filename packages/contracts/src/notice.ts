import { z } from 'zod';
import { IdSchema } from './common';

/**
 * In-app notices (decided 2026-10-20), listed under You → Notices. Step 2 of the beta has one kind:
 * the age range was widened automatically because too few people were left to see.
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

export const NoticeSchema = z.discriminatedUnion('kind', [AudienceWidenedNoticeSchema]);
export type Notice = z.infer<typeof NoticeSchema>;

export const NoticesSchema = z.object({
  notices: z.array(NoticeSchema),
  unreadCount: z.number().int().min(0),
});
export type Notices = z.infer<typeof NoticesSchema>;
