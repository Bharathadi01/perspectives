import { z } from 'zod';

export const ConnectionMode = z.enum([
  'chat',
  'friends',
  'date',
  'collaborate',
  'network',
]);
export type ConnectionMode = z.infer<typeof ConnectionMode>;

export const PerspectiveLens = z.enum([
  'designer',
  'recruiter',
  'woman',
  'man',
  'non_binary',
  'fitness_enthusiast',
  'fitness_beginner',
  'student',
  'founder',
  'photographer',
  'stylist',
  'engineer',
]);
export type PerspectiveLens = z.infer<typeof PerspectiveLens>;

export const ProfilePromptSchema = z.object({
  promptId: z.string(),
  question: z.string(),
  answer: z.string(),
});
export type ProfilePrompt = z.infer<typeof ProfilePromptSchema>;

export const VerificationStatusSchema = z.object({
  contact: z.boolean(),
  selfie: z.boolean(),
});
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const PublicProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  birthYear: z.number().int().optional(),
  ageBand: z.string().optional(),
  cityId: z.string().optional(),
  languages: z.array(z.string()),
  bio: z.string().max(300),
  photoUrls: z.array(z.string().url()),
  prompts: z.array(ProfilePromptSchema),
  lenses: z.array(z.string()),
  connectionModes: z.array(ConnectionMode),
  verification: VerificationStatusSchema,
  helpfulnessTier: z.enum(['new', 'active', 'trusted', 'expert']),
  status: z.enum(['active', 'suspended', 'deleted']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const PrivateUserProfileSchema = z.object({
  userId: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  publicProfile: PublicProfileSchema,
  termsAcceptedVersion: z.string(),
  communityGuidelinesAcceptedVersion: z.string(),
  privacyConsentAcceptedVersion: z.string(),
});
export type PrivateUserProfile = z.infer<typeof PrivateUserProfileSchema>;
