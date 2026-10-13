import { z } from 'zod';
import { ConnectionMode, PublicProfileSchema } from './user';

export const RequestCategory = z.enum([
  'style',
  'fitness',
  'dating_profile',
  'social_situation',
  'career',
  'creative_work',
  'idea_feedback',
  'other',
]);
export type RequestCategory = z.infer<typeof RequestCategory>;

export const ResponseStyle = z.enum([
  'gentle',
  'direct',
  'practical',
  'direct_practical',
  'first_impression',
  'expert',
  'open_ended',
]);
export type ResponseStyle = z.infer<typeof ResponseStyle>;

export const RequestMediaItemSchema = z.object({
  type: z.enum(['image', 'text']),
  storagePath: z.string(),
  moderationState: z.enum(['allowed', 'pending', 'removed']),
});
export type RequestMediaItem = z.infer<typeof RequestMediaItemSchema>;

export const RequestAudienceRulesSchema = z.object({
  languages: z.array(z.string()).default([]),
  lensesAny: z.array(z.string()).default([]),
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  cityIds: z.array(z.string()).default([]),
});
export type RequestAudienceRules = z.infer<typeof RequestAudienceRulesSchema>;

export const RequestStatus = z.enum([
  'draft',
  'pending_moderation',
  'active',
  'paused',
  'fulfilled',
  'expired',
  'removed',
  'archived',
]);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const PerspectiveRequestSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  author: PublicProfileSchema.optional(),
  category: RequestCategory,
  question: z.string().min(5).max(200),
  context: z.string().max(500).optional(),
  responseStyle: ResponseStyle,
  media: z.array(RequestMediaItemSchema).default([]),
  audience: RequestAudienceRulesSchema,
  allowsConnection: z.boolean(),
  allowedConnectionModes: z.array(ConnectionMode),
  status: RequestStatus,
  moderationState: z.enum(['allowed', 'pending', 'removed']),
  responseCount: z.number().int().default(0),
  helpfulCount: z.number().int().default(0),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type PerspectiveRequest = z.infer<typeof PerspectiveRequestSchema>;

export const CreateRequestInputSchema = z.object({
  category: RequestCategory,
  question: z.string().min(5).max(200),
  context: z.string().max(500).optional(),
  responseStyle: ResponseStyle,
  media: z.array(RequestMediaItemSchema).optional(),
  audience: RequestAudienceRulesSchema.optional(),
  allowsConnection: z.boolean().default(true),
  allowedConnectionModes: z.array(ConnectionMode).default(['chat', 'friends']),
  idempotencyKey: z.string().uuid(),
});
export type CreateRequestInput = z.infer<typeof CreateRequestInputSchema>;
