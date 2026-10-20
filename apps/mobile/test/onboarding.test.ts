import { useOnboardingStore } from '../src/session/onboardingStore';

describe('Mobile Onboarding Store & Navigation State', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('initializes at step 0 with clean defaults', () => {
    const state = useOnboardingStore.getState();
    expect(state.stepIndex).toBe(0);
    expect(state.selectedInterests).toEqual([]);
    expect(state.goals).toEqual([]);
    // Orientation is optional and private (decided 2026-10-20): nothing is pre-selected.
    expect(state.orientation).toBeNull();
    expect(state).not.toHaveProperty('datingIntention');
  });

  it('starts a perspectives-only audience with every gender selected, unless the person already chose', () => {
    useOnboardingStore.getState().setGoals(['get_perspectives']);
    expect(useOnboardingStore.getState().audienceGenders).toEqual(['woman', 'man', 'non_binary']);

    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setGoals(['meet_people']);
    expect(useOnboardingStore.getState().audienceGenders).toEqual(['woman']);

    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setField('audienceGenders', ['man']);
    useOnboardingStore.getState().setField('audienceTouched', true);
    useOnboardingStore.getState().setGoals(['get_perspectives']);
    expect(useOnboardingStore.getState().audienceGenders).toEqual(['man']);
  });

  it('progresses forward and preserves answers when navigating backward', () => {
    const store = useOnboardingStore.getState();

    // Fill Step 0: About You
    store.setField('displayName', 'Maya');
    store.setField('gender', 'woman');
    store.setField('pronouns', 'she/her');
    store.setStepIndex(1);

    expect(useOnboardingStore.getState().stepIndex).toBe(1);
    expect(useOnboardingStore.getState().displayName).toBe('Maya');

    // Fill Step 1: Goal
    useOnboardingStore.getState().setGoals(['get_perspectives', 'meet_people']);
    useOnboardingStore.getState().setStepIndex(2);

    expect(useOnboardingStore.getState().stepIndex).toBe(2);
    expect(useOnboardingStore.getState().goals).toEqual(['get_perspectives', 'meet_people']);

    // Navigate back to Step 0
    useOnboardingStore.getState().setStepIndex(0);
    expect(useOnboardingStore.getState().displayName).toBe('Maya');
    expect(useOnboardingStore.getState().goals).toEqual(['get_perspectives', 'meet_people']);
  });

  it('stores selected interests and enforces state consistency', () => {
    const store = useOnboardingStore.getState();

    // Select interests
    store.setField('selectedInterests', ['cinema_film', 'specialty_coffee', 'books_reading']);
    expect(useOnboardingStore.getState().selectedInterests).toEqual([
      'cinema_film',
      'specialty_coffee',
      'books_reading',
    ]);

    // Check bound clamp
    store.setStepIndex(10);
    expect(useOnboardingStore.getState().stepIndex).toBe(6); // clamped to the last step (review)

    store.setStepIndex(-2);
    expect(useOnboardingStore.getState().stepIndex).toBe(0); // clamped to min step 0
  });

  it('stores personality prompts cleanly', () => {
    const store = useOnboardingStore.getState();

    store.setField('personalityPrompts', [
      {
        promptId: 'ideal_sunday',
        question: 'My ideal Sunday looks like...',
        answer: 'Pouring coffee and reading magazines in sunlight.',
      },
    ]);

    const prompts = useOnboardingStore.getState().personalityPrompts;
    expect(prompts).toHaveLength(1);
    expect(prompts[0].promptId).toBe('ideal_sunday');
    expect(prompts[0].answer).toBe('Pouring coffee and reading magazines in sunlight.');
  });
});
