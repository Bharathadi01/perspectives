import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  senderId: z.string(),
  text: z.string().min(1).max(1000),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const SendMessageInputSchema = z.object({
  connectionId: z.string(),
  text: z.string().min(1).max(1000),
  idempotencyKey: z.string().uuid(),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
