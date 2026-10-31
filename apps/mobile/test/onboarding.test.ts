import type { MyProfile } from '@perspective/contracts';
import {
  NO_BACK_STEPS,
  STEP_IDS,
  STEP_PROGRESS,
  VALUE_STEPS,
  flowState,
  isStepId,
  nextStep,
  resumeStep,
  type StepId,
} from '../src/features/onboarding/flow';
import {
  ageToFraction,
  birthDateFrom,
  checkBirthday,
  clampHeight,
  cmFromFeetInches,
  feetInchesFromCm,
  formatFeetInchesPrimes,
  formatLongDate,
  fractionToAge,
  looksLikeEmail,
} from '../src/features/onboarding/values';

const START = { selfieVerified: false, hasPrimaryPhotoPost: false };

function profile(overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'a@example.com',
    birthDate: '2001-03-14',
    age: 25,
    displayName: 'Aanya',
    gender: 'woman',
    pronouns: 'she/her',
    heightCm: 165,
    orientation: null,
    city: 'Bengaluru',
    goals: ['get_perspectives'],
    audience: { genders: ['woman', 'man'], minAge: 22, maxAge: 30 },
    interests: ['a', 'b', 'c'],
    lifestylePace: null,
    socialPreference: null,
    personalityPrompts: [],
    selfieStatus: 'verified',
    posts: [],
    isLive: true,
    missing: [],
    ...overrides,
  };
}

describe('onboarding flow', () => {
  it('walks every step in the designed order, from the first value screen to Explore', () => {
    const seen: StepId[] = [];
    let step: StepId | 'explore' = 'value-perspectives';
    while (step !== 'explore' && seen.length < 50) {
      seen.push(step);
      step = nextStep(step, START);
    }
    expect(seen).toEqual([
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
      'review',
      'how-it-works',
      'notifications',
      'ready',
    ]);
  });

  it('skips the camera for someone already verified, and the first photo for someone who has one', () => {
    expect(nextStep('personality', { selfieVerified: true, hasPrimaryPhotoPost: false })).toBe('value-seen');
    expect(nextStep('posts', { selfieVerified: true, hasPrimaryPhotoPost: true })).toBe('more-posts');
  });

  it('sends a saved voice post back to the list of posts', () => {
    expect(nextStep('voice', START)).toBe('more-posts');
  });

  it('reads the flow state from the profile', () => {
    expect(flowState(profile({ selfieStatus: 'rejected', missing: ['selfie', 'primary_photo_post'] }))).toEqual(START);
    expect(flowState(profile())).toEqual({ selfieVerified: true, hasPrimaryPhotoPost: true });
  });

  it('has four value screens, each one fading in, and a progress value only on question steps', () => {
    expect(VALUE_STEPS).toHaveLength(4);
    for (const v of VALUE_STEPS) expect(STEP_PROGRESS[v]).toBeUndefined();
    expect(STEP_PROGRESS.name).toBe(5);
    expect(STEP_PROGRESS.review).toBe(100);
    expect(NO_BACK_STEPS).toContain('verified');
  });

  it('knows its own step ids', () => {
    expect(STEP_IDS.every(isStepId)).toBe(true);
    expect(isStepId('nope')).toBe(false);
    expect(isStepId(undefined)).toBe(false);
  });
});

describe('resuming an unfinished profile', () => {
  it('starts at the first required answer that is missing', () => {
    expect(resumeStep(profile({ displayName: null }))).toBe('basics');
    expect(resumeStep(profile({ gender: null }))).toBe('gender');
    expect(resumeStep(profile({ heightCm: null }))).toBe('height');
    expect(resumeStep(profile({ city: null }))).toBe('city');
    expect(resumeStep(profile({ goals: [] }))).toBe('goal');
    expect(resumeStep(profile({ audience: null }))).toBe('audience');
    expect(resumeStep(profile({ interests: ['a', 'b'] }))).toBe('interests');
    expect(resumeStep(profile({ selfieStatus: 'unverified' }))).toBe('selfie');
    expect(resumeStep(profile({ selfieStatus: 'rejected' }))).toBe('selfie');
    expect(resumeStep(profile({ missing: ['primary_photo_post'] }))).toBe('posts');
  });

  it('never stops on optional answers', () => {
    expect(resumeStep(profile({ pronouns: null, orientation: null, personalityPrompts: [], lifestylePace: null }))).toBeNull();
  });
});

describe('height', () => {
  it('converts feet and inches to centimetres and back', () => {
    expect(cmFromFeetInches(5, 5)).toBe(165);
    expect(feetInchesFromCm(165)).toEqual({ feet: 5, inches: 5 });
    expect(formatFeetInchesPrimes(165)).toBe('5′5″');
  });

  it('keeps every choice inside the allowed 120 to 230 cm', () => {
    expect(cmFromFeetInches(7, 11)).toBe(230);
    expect(clampHeight(100)).toBe(120);
    expect(cmFromFeetInches(4, 0)).toBeGreaterThanOrEqual(120);
  });
});

describe('birthday', () => {
  const today = new Date(Date.UTC(2026, 9, 31));

  it('builds the day key from what was typed', () => {
    expect(birthDateFrom('14', '3', '2001', today)).toBe('2001-03-14');
    expect(birthDateFrom('4', '03', '2001', today)).toBe('2001-03-04');
  });

  it('refuses dates that do not exist, two-digit years and the future', () => {
    expect(birthDateFrom('31', '02', '2001', today)).toBeNull();
    expect(birthDateFrom('14', '13', '2001', today)).toBeNull();
    expect(birthDateFrom('14', '03', '01', today)).toBeNull();
    expect(birthDateFrom('01', '01', '2027', today)).toBeNull();
  });

  it('confirms the age, and turns away anyone under 18', () => {
    expect(checkBirthday('14', '03', '2001', today)).toEqual({ ok: true, birthDate: '2001-03-14', age: 25 });
    expect(checkBirthday('01', '11', '2008', today)).toEqual({ ok: false, message: 'You must be 18 or older to use Perspective.' });
    expect(checkBirthday('31', '10', '2008', today)).toMatchObject({ ok: true, age: 18 });
  });

  it('writes the date out in words for the confirm sheet', () => {
    expect(formatLongDate('2001-03-14')).toBe('14 March 2001');
  });
});

describe('email and age range helpers', () => {
  it('accepts plain email addresses only', () => {
    expect(looksLikeEmail('aanya.rao@example.com')).toBe(true);
    expect(looksLikeEmail(' aanya@example.in ')).toBe(true);
    expect(looksLikeEmail('aanya@')).toBe(false);
    expect(looksLikeEmail('aanya example.com')).toBe(false);
  });

  it('maps ages to the slider track and back', () => {
    expect(ageToFraction(18)).toBe(0);
    expect(ageToFraction(99)).toBe(1);
    expect(fractionToAge(0.5)).toBe(59);
    expect(fractionToAge(-1)).toBe(18);
    expect(fractionToAge(2)).toBe(99);
  });
});
