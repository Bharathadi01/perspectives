import { create } from 'zustand';
import type {
  DatingIntention,
  Gender,
  LifestylePace,
  MyProfile,
  Orientation,
  PersonalityPromptAnswer,
  SocialPreference,
} from '@perspective/contracts';
import { RULES } from '@perspective/contracts';

export interface OnboardingDraftState {
  // Step 1: About You
  displayName: string;
  gender: Gender | null;
  pronouns: string;
  heightCm: string;
  orientation: Orientation | null;
  city: string;
  selfieVerified: boolean;

  // Step 2: Who would you like to meet?
  audienceGenders: Gender[];
  audienceMinAge: number;
  audienceMaxAge: number;
  datingIntention: DatingIntention | null;
  intentionDealbreaker: boolean;

  // Step 3: Interests
  selectedInterests: string[];

  // Step 4: What matters to you? (Lifestyle & Social Pace)
  lifestylePace: LifestylePace | null;
  socialPreference: SocialPreference | null;

  // Step 5: Personality Prompts
  personalityPrompts: PersonalityPromptAnswer[];

  // Step index
  stepIndex: number;

  // Actions
  setField: <K extends keyof OnboardingDraftState>(key: K, val: OnboardingDraftState[K]) => void;
  setStepIndex: (idx: number) => void;
  initializeFromProfile: (me: MyProfile) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  displayName: '',
  gender: null as Gender | null,
  pronouns: '',
  heightCm: '',
  orientation: 'straight' as Orientation | null,
  city: '',
  selfieVerified: false,

  audienceGenders: ['woman'] as Gender[],
  audienceMinAge: RULES.minAge,
  audienceMaxAge: 35,
  datingIntention: 'long_term_open' as DatingIntention | null,
  intentionDealbreaker: false,

  selectedInterests: [] as string[],

  lifestylePace: null as LifestylePace | null,
  socialPreference: null as SocialPreference | null,

  personalityPrompts: [] as PersonalityPromptAnswer[],

  stepIndex: 0,
};

export const useOnboardingStore = create<OnboardingDraftState>((set) => ({
  ...DEFAULT_STATE,

  setField: (key, val) => set((s) => ({ ...s, [key]: val })),

  setStepIndex: (idx) => set({ stepIndex: Math.max(0, Math.min(5, idx)) }),

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
      audienceGenders: me.audience?.genders?.length ? me.audience.genders : s.audienceGenders,
      audienceMinAge: me.audience?.minAge ?? s.audienceMinAge,
      audienceMaxAge: me.audience?.maxAge ?? s.audienceMaxAge,
      datingIntention: me.datingIntention ?? s.datingIntention,
      intentionDealbreaker: me.intentionDealbreaker ?? s.intentionDealbreaker,
      selectedInterests: me.interests?.length ? me.interests : s.selectedInterests,
      lifestylePace: me.lifestylePace ?? s.lifestylePace,
      socialPreference: me.socialPreference ?? s.socialPreference,
      personalityPrompts: me.personalityPrompts?.length ? me.personalityPrompts : s.personalityPrompts,
    })),

  reset: () => set(DEFAULT_STATE),
}));
