import type { MyProfile, Post, PublicProfile } from '@perspective/contracts';

/**
 * How the person's own profile looks to everyone else.
 *
 * Returns null while a basic is still missing, because a profile without them
 * has nothing to show. Pass `draftPosts` to preview an order that has not been
 * saved yet.
 */
export function asPublicProfile(me: MyProfile, draftPosts?: Post[]): PublicProfile | null {
  if (!me.displayName || !me.gender || !me.heightCm || !me.city) return null;
  return {
    id: me.id,
    displayName: me.displayName,
    age: me.age,
    gender: me.gender,
    heightCm: me.heightCm,
    city: me.city,
    pronouns: me.pronouns ?? null,
    interests: me.interests ?? [],
    lifestylePace: me.lifestylePace ?? null,
    socialPreference: me.socialPreference ?? null,
    personalityPrompts: me.personalityPrompts ?? [],
    verified: me.selfieStatus === 'verified',
    posts: draftPosts ?? me.posts,
  };
}
