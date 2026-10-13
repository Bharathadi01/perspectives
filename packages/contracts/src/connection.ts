import { z } from 'zod';
import { ConnectionMode, PublicProfileSchema } from './user';
import { PerspectiveRequestSchema } from './request';
import { PerspectiveResponseSchema } from './response';

export const ConnectionStatus = z.enum([
  'none',
  'interest_a',
  'interest_b',
  'mutual_pending',
  'active',
  'paused',
  'unmatched',
  'blocked',
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatus>;

export const OriginSnapshotSchema = z.object({
  requestId: z.string(),
  requestQuestion: z.string(),
  responseId: z.string(),
  responseFirstImpression: z.string(),
  responseReason: z.string().optional(),
});
export type OriginSnapshot = z.infer<typeof OriginSnapshotSchema>;

export const ConnectionSchema = z.object({
  id: z.string(),
  partner: PublicProfileSchema,
  status: ConnectionStatus,
  mode: ConnectionMode,
  origin: OriginSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Connection = z.infer<typeof ConnectionSchema>;
