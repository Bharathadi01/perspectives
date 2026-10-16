import { RULES } from '@perspective/contracts';
import { PROMPT_LIBRARY } from '../src/lib/promptLibrary';

describe('Prompt Library', () => {
  it('contains diverse prompts across all core categories', () => {
    const categories = new Set(PROMPT_LIBRARY.map((p) => p.category));
    expect(categories.has('first_impressions')).toBe(true);
    expect(categories.has('personality')).toBe(true);
    expect(categories.has('dating')).toBe(true);
    expect(categories.has('interests')).toBe(true);
    expect(categories.has('voice')).toBe(true);
  });

  it('validates all prompts adhere to length contracts', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(prompt.text.trim().length).toBeGreaterThanOrEqual(RULES.promptMinLength);
      expect(prompt.text.trim().length).toBeLessThanOrEqual(RULES.promptMaxLength);
      expect(prompt.defaultFocusAreas.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('correctly maps voice prompts to voice postCategory', () => {
    const voicePrompts = PROMPT_LIBRARY.filter((p) => p.category === 'voice');
    expect(voicePrompts.length).toBeGreaterThan(0);
    for (const vp of voicePrompts) {
      expect(vp.postCategory).toBe('voice');
    }
  });
});
