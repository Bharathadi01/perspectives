import { z } from 'zod';
import { DayKeySchema, IdSchema, RULES } from './common';
import { PostSchema } from './post';

/** assumption: gender options (not enumerated by the product owner) */
export const Gender = z.enum(['woman', 'man', 'non_binary']);
export type Gender = z.infer<typeof Gender>;

/** assumption: orientation/preference options (not enumerated by the product owner) */
export const Orientation = z.enum([
  'straight',
  'gay',
  'lesbian',
  'bisexual',
  'pansexual',
  'queer',
  'asexual',
  'prefer_not_to_say',
]);
export type Orientation = z.infer<typeof Orientation>;

export const SelfieStatus = z.enum(['unverified', 'verified', 'rejected']);
export type SelfieStatus = z.infer<typeof SelfieStatus>;

/** What is still missing before a profile goes live. */
export const ProfileRequirement = z.enum(['basics', 'audience', 'selfie', 'primary_photo_post']);
export type ProfileRequirement = z.infer<typeof ProfileRequirement>;

/** Who may see this profile. Set once at profile level, always 18+. */
export const AudienceSchema = z
  .object({
    genders: z.array(Gender).min(1),
    minAge: z.number().int().min(RULES.minAge).max(RULES.maxAudienceAge),
    maxAge: z.number().int().min(RULES.minAge).max(RULES.maxAudienceAge),
  })
  .refine((a) => a.minAge <= a.maxAge, { message: 'Minimum age must not exceed maximum age', path: ['minAge'] })
  .refine((a) => new Set(a.genders).size === a.genders.length, { message: 'Genders must be unique', path: ['genders'] });
export type Audience = z.infer<typeof AudienceSchema>;

/** Small identity card used in lists (inbox, connections, chat). */
export const ProfileSummarySchema = z.object({
  id: IdSchema,
  displayName: z.string(),
  age: z.number().int(),
  verified: z.boolean(),
  primaryPhotoUrl: z.string().nullable(),
});
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;

/**
 * What another user may see. Never contains email, phone, exact birthday, precise location,
 * verification media, moderation notes, or private settings.
 */
export const PublicProfileSchema = z.object({
  id: IdSchema,
  displayName: z.string(),
  age: z.number().int(),
  gender: Gender,
  heightCm: z.number().int(),
  orientation: Orientation,
  city: z.string(),
  verified: z.boolean(),
  posts: z.array(PostSchema),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

/** The signed-in user's own profile, including private fields. */
export const MyProfileSchema = z.object({
  id: IdSchema,
  email: z.string(),
  birthDate: DayKeySchema,
  age: z.number().int(),
  displayName: z.string().nullable(),
  gender: Gender.nullable(),
  heightCm: z.number().int().nullable(),
  orientation: Orientation.nullable(),
  city: z.string().nullable(),
  audience: AudienceSchema.nullable(),
  selfieStatus: SelfieStatus,
  posts: z.array(PostSchema),
  isLive: z.boolean(),
  missing: z.array(ProfileRequirement),
});
export type MyProfile = z.infer<typeof MyProfileSchema>;

export const UpdateProfileInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(RULES.displayNameMaxLength),
    gender: Gender,
    heightCm: z.number().int().min(RULES.heightCmMin).max(RULES.heightCmMax),
    orientation: Orientation,
    city: z.string().trim().min(2).max(80),
    audience: AudienceSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const SelfieVerificationInputSchema = z.object({ mediaId: IdSchema });
export type SelfieVerificationInput = z.infer<typeof SelfieVerificationInputSchema>;
