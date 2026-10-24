import { CATEGORY_CATALOG, RULES } from '@perspective/contracts';
import {
  buildCreateInput,
  defaultFocusAreas,
  focusAreasBelongTo,
  problemWithStep,
  reconcileFocusAreas,
  stepsFor,
  toggleFocusArea,
  type ComposerState,
} from '../src/features/post-composer/composer';

const base: ComposerState = {
  kind: 'photo',
  prompt: 'What would you assume about me?',
  category: 'looks',
  focusAreas: ['first_look'],
  hasPhoto: true,
  hasRecording: false,
};

describe('stepsFor', () => {
  it('walks a photo through photo, question, then the optional voice note', () => {
    expect(stepsFor('photo')).toEqual(['photo', 'question', 'voice']);
  });
  it('skips the photo step for a voice-only card', () => {
    expect(stepsFor('audio')).toEqual(['question', 'voice']);
  });
  it('asks a written card for the question alone', () => {
    expect(stepsFor('text')).toEqual(['question']);
  });
});

describe('focus areas follow their category', () => {
  it('seeds from the category', () => {
    expect(defaultFocusAreas('voice')).toEqual([CATEGORY_CATALOG.voice.focusAreas[0].key]);
  });

  it('replaces focus areas that do not belong to the new category', () => {
    // The old editor kept 'tone' when the category changed to looks, and the
    // server rejected the payload: "Not a focus area of looks: tone".
    const next = reconcileFocusAreas('looks', ['tone']);
    expect(focusAreasBelongTo('looks', next)).toBe(true);
    expect(next).toEqual(defaultFocusAreas('looks'));
  });

  it('keeps the ones that do belong', () => {
    expect(reconcileFocusAreas('looks', ['photo', 'tone'])).toEqual(['photo']);
  });

  it('never returns an empty list', () => {
    expect(reconcileFocusAreas('vibe', []).length).toBeGreaterThanOrEqual(RULES.minFocusAreas);
  });
});

describe('toggleFocusArea', () => {
  it('adds one', () => {
    expect(toggleFocusArea(['first_look'], 'photo')).toEqual(['first_look', 'photo']);
  });
  it('removes one', () => {
    expect(toggleFocusArea(['first_look', 'photo'], 'photo')).toEqual(['first_look']);
  });
  it('refuses to drop below the minimum', () => {
    expect(toggleFocusArea(['first_look'], 'first_look')).toBe('at_min');
  });
  it('refuses to go past the maximum', () => {
    const full = CATEGORY_CATALOG.looks.focusAreas.slice(0, RULES.maxFocusAreas).map((f) => f.key);
    expect(toggleFocusArea(full, 'presence')).toBe('at_max');
  });
});

describe('problemWithStep', () => {
  it('wants a photo before leaving the photo step', () => {
    expect(problemWithStep('photo', { ...base, hasPhoto: false })).toBe('no_photo');
    expect(problemWithStep('photo', base)).toBeNull();
  });

  it('wants a long enough question', () => {
    expect(problemWithStep('question', { ...base, prompt: 'hi' })).toBe('prompt_too_short');
  });

  it('counts a question of only spaces as empty', () => {
    expect(problemWithStep('question', { ...base, prompt: '          ' })).toBe('prompt_too_short');
  });

  it('wants at least one focus area', () => {
    expect(problemWithStep('question', { ...base, focusAreas: [] })).toBe('no_focus_area');
  });

  it('leaves the voice note optional on a photo card', () => {
    expect(problemWithStep('voice', base)).toBeNull();
  });

  it('requires a recording on a voice-only card', () => {
    const voiceOnly: ComposerState = { ...base, kind: 'audio', hasPhoto: false };
    expect(problemWithStep('voice', voiceOnly)).toBe('no_recording');
    expect(problemWithStep('voice', { ...voiceOnly, hasRecording: true })).toBeNull();
  });
});

describe('buildCreateInput', () => {
  it('carries a photo and a voice clip together on one card', () => {
    const input = buildCreateInput(base, { mediaId: 'photo-id', audioMediaId: 'audio-id' });
    expect(input.kind).toBe('photo');
    expect(input.mediaId).toBe('photo-id');
    expect(input.audioMediaId).toBe('audio-id');
    expect(input.prompt).toBe('What would you assume about me?');
  });

  it('trims the question', () => {
    const input = buildCreateInput({ ...base, prompt: '  spaced out question  ' }, {});
    expect(input.prompt).toBe('spaced out question');
  });

  it('sends null rather than undefined for absent media', () => {
    const input = buildCreateInput({ ...base, kind: 'text' }, {});
    expect(input.mediaId).toBeNull();
    expect(input.audioMediaId).toBeNull();
  });
});
