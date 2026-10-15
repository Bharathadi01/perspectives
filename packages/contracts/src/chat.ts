import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, RULES } from './common';

export const MessageSchema = z.object({
  id: IdSchema,
  connectionId: IdSchema,
  senderId: IdSchema,
  text: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageInputSchema = z.object({
  text: z.string().trim().min(1).max(RULES.messageMaxLength),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
