import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';
import { DailyStatusSchema } from './explore';
import { ReceivedPerspectiveSchema } from './perspective';
import { PostRefSchema } from './post';
import { ProfileSummarySchema, PublicProfileSchema } from './profile';

export const ConnectRequestStatus = z.enum(['pending', 'accepted', 'declined', 'cancelled']);
export type ConnectRequestStatus = z.infer<typeof ConnectRequestStatus>;

export const ConnectionStatus = z.enum(['active', 'unmatched', 'blocked']);
export type ConnectionStatus = z.infer<typeof ConnectionStatus>;

export const CreateConnectRequestInputSchema = z.object({ receiverId: IdSchema });
export type CreateConnectRequestInput = z.infer<typeof CreateConnectRequestInputSchema>;

export const ConnectRequestResultSchema = z.object({ id: IdSchema, status: ConnectRequestStatus });
export type ConnectRequestResult = z.infer<typeof ConnectRequestResultSchema>;

/** An incoming request, shown together with the perspective that earned it. */
export const IncomingConnectRequestSchema = z.object({
  id: IdSchema,
  sender: ProfileSummarySchema,
  perspective: z.object({
    id: IdSchema,
    comment: z.string(),
    chips: z.array(z.string()),
    post: PostRefSchema,
  }),
  createdAt: IsoDateTimeSchema,
});
export type IncomingConnectRequest = z.infer<typeof IncomingConnectRequestSchema>;

export const InboxGroupSchema = z.object({
  post: PostRefSchema,
  perspectives: z.array(ReceivedPerspectiveSchema),
});
export type InboxGroup = z.infer<typeof InboxGroupSchema>;

export const InboxSchema = z.object({
  daily: DailyStatusSchema,
  /** Received items still hidden until the daily set is done. */
  lockedCount: z.number().int().min(0),
  groups: z.array(InboxGroupSchema),
  connectRequests: z.array(IncomingConnectRequestSchema),
});
export type Inbox = z.infer<typeof InboxSchema>;

export const ConnectionSchema = z.object({
  id: IdSchema,
  partner: ProfileSummarySchema,
  status: ConnectionStatus,
  /** The perspective that led to the connection. */
  origin: z.object({
    fromUserId: IdSchema,
    comment: z.string(),
    postPrompt: z.string(),
  }),
  lastMessage: z
    .object({ text: z.string(), senderId: IdSchema, createdAt: IsoDateTimeSchema })
    .nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Connection = z.infer<typeof ConnectionSchema>;

/** How the viewer relates to a profile they are looking at. */
export const RelationshipSchema = z.object({
  gaveToThem: z.boolean(),
  theyGaveToMe: z.boolean(),
  connectionId: IdSchema.nullable(),
  outgoingRequestPending: z.boolean(),
  incomingRequestId: IdSchema.nullable(),
  /** ISO time when a new request becomes possible after a decline, or null. */
  cooldownUntil: IsoDateTimeSchema.nullable(),
  canRequestConnect: z.boolean(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const ProfileViewSchema = z.object({
  profile: PublicProfileSchema,
  relationship: RelationshipSchema,
  givenPostIds: z.array(IdSchema),
});
export type ProfileView = z.infer<typeof ProfileViewSchema>;
