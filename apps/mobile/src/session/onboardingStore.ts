import { create } from 'zustand';
import type {
  Gender,
  Goal,
  LifestylePace,
  MyProfile,
  Orientation,
  PersonalityPromptAnswer,
  SocialPreference,
} from '@perspective/contracts';
import { Gender as GenderEnum, RULES } from '@perspective/contracts';

/** Onboarding steps: about you, goal, audience, interests, what matters, personality, review. */
export const ONBOARDING_STEP_COUNT = 7;

export interface OnboardingDraftState {
  // Step 1: About You
  displayName: string;
  gender: Gender | null;
  pronouns: string;
  heightCm: string;
  /** Optional and private (decided 2026-10-20). */
  orientation: Orientation | null;
  city: string;
  selfieVerified: boolean;

  // Step 2: Goal (private)
  goals: Goal[];

  // Step 3: Audience, worded by the goal
  audienceGenders: Gender[];
  audienceMinAge: number;
  audienceMaxAge: number;
  /** True once the person (or their saved profile) chose genders, so the goal no longer pre-fills them. */
  audienceTouched: boolean;

  // Step 4: Interests
  selectedInterests: string[];

  // Step 5: What matters to you? (Lifestyle & Social Pace)
  lifestylePace: LifestylePace | null;
  socialPreference: SocialPreference | null;

  // Step 6: Personality Prompts
  personalityPrompts: PersonalityPromptAnswer[];

  // Step index
  stepIndex: number;

  // Actions
  setField: <K extends keyof OnboardingDraftState>(key: K, val: OnboardingDraftState[K]) => void;
  setStepIndex: (idx: number) => void;
  /** Saves the goal; "Get perspectives" alone starts the audience with every gender selected. */
  setGoals: (goals: Goal[]) => void;
  initializeFromProfile: (me: MyProfile) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  displayName: '',
  gender: null as Gender | null,
  pronouns: '',
  heightCm: '',
  orientation: null as Orientation | null,
  city: '',
  selfieVerified: false,

  goals: [] as Goal[],

  audienceGenders: ['woman'] as Gender[],
  audienceMinAge: RULES.minAge,
  audienceMaxAge: 35,
  audienceTouched: false,

  selectedInterests: [] as string[],

  lifestylePace: null as LifestylePace | null,
  socialPreference: null as SocialPreference | null,

  personalityPrompts: [] as PersonalityPromptAnswer[],

  stepIndex: 0,
};

export const useOnboardingStore = create<OnboardingDraftState>((set) => ({
  ...DEFAULT_STATE,

  setField: (key, val) => set((s) => ({ ...s, [key]: val })),

  setStepIndex: (idx) => set({ stepIndex: Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, idx)) }),

  setGoals: (goals) =>
    set((s) => {
      const onlyPerspectives = goals.length === 1 && goals[0] === 'get_perspectives';
      return {
        ...s,
        goals,
        ...(onlyPerspectives && !s.audienceTouched ? { audienceGenders: [...GenderEnum.options] } : {}),
      };
    }),

  initializeFromProfile: (me) =>
    set((s) => ({
      ...s,
      displayName: me.displayName ?? s.displayName,
      gender: me.gender ?? s.gender,
      pronouns: me.pronouns ?? s.pronouns,
      heightCm: me.heightCm ? String(me.heightCm) : s.heightCm,
      orientation: me.orientation ?? s.orientation,
      city: me.city ?? s.city,
      selfieVerified: me.selfieStatus === 'verified',
      goals: me.goals?.length ? me.goals : s.goals,
      audienceGenders: me.audience?.genders?.length ? me.audience.genders : s.audienceGenders,
      audienceMinAge: me.audience?.minAge ?? s.audienceMinAge,
      audienceMaxAge: me.audience?.maxAge ?? s.audienceMaxAge,
      audienceTouched: s.audienceTouched || Boolean(me.audience?.genders?.length),
      selectedInterests: me.interests?.length ? me.interests : s.selectedInterests,
      lifestylePace: me.lifestylePace ?? s.lifestylePace,
      socialPreference: me.socialPreference ?? s.socialPreference,
      personalityPrompts: me.personalityPrompts?.length ? me.personalityPrompts : s.personalityPrompts,
    })),

  reset: () => set(DEFAULT_STATE),
}));
