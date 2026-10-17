import { useOnboardingStore } from '../src/session/onboardingStore';

describe('Mobile Onboarding Store & Navigation State', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('initializes at step 0 with clean defaults', () => {
    const state = useOnboardingStore.getState();
    expect(state.stepIndex).toBe(0);
    expect(state.selectedInterests).toEqual([]);
    expect(state.datingIntention).toBe('long_term_open');
    expect(state.intentionDealbreaker).toBe(false);
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

    // Fill Step 1: Intentions
    useOnboardingStore.getState().setField('datingIntention', 'long_term');
    useOnboardingStore.getState().setField('intentionDealbreaker', true);
    useOnboardingStore.getState().setStepIndex(2);

    expect(useOnboardingStore.getState().stepIndex).toBe(2);
    expect(useOnboardingStore.getState().datingIntention).toBe('long_term');
    expect(useOnboardingStore.getState().intentionDealbreaker).toBe(true);

    // Navigate back to Step 0
    useOnboardingStore.getState().setStepIndex(0);
    expect(useOnboardingStore.getState().displayName).toBe('Maya');
    expect(useOnboardingStore.getState().datingIntention).toBe('long_term');
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
    expect(useOnboardingStore.getState().stepIndex).toBe(5); // clamped to max step 5

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
