import type { MyProfile } from '@perspective/contracts';

/**
 * The onboarding after sign-up, one screen per step (design canvas 2026-10-31). Account creation
 * (email, password, birthday) comes before this, in app/(auth). Every step saves to the server as
 * it goes, so leaving half-way and coming back resumes where the profile is missing something.
 */
export const STEP_IDS = [
  'value-perspectives',
  'basics',
  'name',
  'gender',
  'pronouns',
  'height',
  'city',
  'orientation',
  'preview',
  'value-words',
  'goal',
  'audience',
  'value-connect',
  'interests',
  'rhythm',
  'personality',
  'selfie',
  'selfie-camera',
  'verified',
  'value-seen',
  'posts',
  'first-post',
  'focus',
  'more-posts',
  'voice',
  'review',
  'how-it-works',
  'notifications',
  'ready',
] as const;
export type StepId = (typeof STEP_IDS)[number];

export function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && (STEP_IDS as readonly string[]).includes(value);
}

/** The "What you get" screens between sections. They fade in rather than slide. */
export const VALUE_STEPS: readonly StepId[] = ['value-perspectives', 'value-words', 'value-connect', 'value-seen'];

/** Steps you cannot swipe back from: going back would undo nothing and only confuse. */
export const NO_BACK_STEPS: readonly StepId[] = ['value-perspectives', 'verified', 'how-it-works', 'notifications', 'ready'];

/** The thin progress bar along the top of the profile questions, 0 to 100, as in the design. */
export const STEP_PROGRESS: Partial<Record<StepId, number>> = {
  name: 5,
  gender: 10,
  pronouns: 15,
  height: 20,
  city: 25,
  orientation: 30,
  goal: 38,
  audience: 44,
  interests: 50,
  rhythm: 56,
  personality: 62,
  'first-post': 72,
  focus: 78,
  'more-posts': 84,
  voice: 90,
  review: 100,
};

/** Interests: pick 3 to 10 (onboarding rule since the first onboarding; 10 is the server's limit). */
export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 10;

export interface FlowState {
  selfieVerified: boolean;
  hasPrimaryPhotoPost: boolean;
}

export function flowState(me: Pick<MyProfile, 'selfieStatus' | 'missing'>): FlowState {
  return {
    selfieVerified: me.selfieStatus === 'verified',
    hasPrimaryPhotoPost: !me.missing.includes('primary_photo_post'),
  };
}

const LINEAR: readonly StepId[] = STEP_IDS.filter((s) => s !== 'voice');

/** Where "Next" goes from a step. `explore` means onboarding is over. */
export function nextStep(step: StepId, state: FlowState): StepId | 'explore' {
  switch (step) {
    case 'personality':
      // Someone who verified on an earlier visit skips the camera.
      return state.selfieVerified ? 'value-seen' : 'selfie';
    case 'posts':
      return state.hasPrimaryPhotoPost ? 'more-posts' : 'first-post';
    case 'voice':
      return 'more-posts';
    case 'ready':
      return 'explore';
    default: {
      const i = LINEAR.indexOf(step);
      return LINEAR[i + 1] ?? 'explore';
    }
  }
}

/**
 * The first step whose answer the profile still lacks, for someone who signed up but did not
 * finish. Optional steps (pronouns, orientation, rhythm, personality, more posts) never block.
 * `null` means nothing required is missing.
 */
export function resumeStep(
  me: Pick<MyProfile, 'displayName' | 'gender' | 'heightCm' | 'city' | 'goals' | 'audience' | 'interests' | 'selfieStatus' | 'missing'>,
): StepId | null {
  if (!me.displayName) return 'basics';
  if (!me.gender) return 'gender';
  if (!me.heightCm) return 'height';
  if (!me.city) return 'city';
  if (me.goals.length === 0) return 'goal';
  if (!me.audience) return 'audience';
  if (me.interests.length < MIN_INTERESTS) return 'interests';
  if (me.selfieStatus !== 'verified') return 'selfie';
  if (me.missing.includes('primary_photo_post')) return 'posts';
  return null;
}
