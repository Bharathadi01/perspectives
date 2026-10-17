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

  it('validates photo post with attached voice perspective schema', () => {
    const { CreatePostInputSchema, PostSchema } = require('@perspective/contracts');

    const input = {
      kind: 'photo',
      mediaId: 'a0000000-0000-0000-0000-000000000001',
      audioMediaId: 'a0000000-0000-0000-0000-000000000002',
      prompt: 'What vibe does this photo give you?',
      category: 'looks',
      focusAreas: ['first_look'],
    };

    const parsedInput = CreatePostInputSchema.parse(input);
    expect(parsedInput.audioMediaId).toBe('a0000000-0000-0000-0000-000000000002');

    const postPayload = {
      id: 'e0000000-0000-0000-0000-000000000001',
      ownerId: 'f0000000-0000-0000-0000-000000000001',
      position: 0,
      kind: 'photo',
      mediaUrl: 'https://cdn.example.com/photo.jpg',
      durationSec: null,
      audioMediaUrl: 'https://cdn.example.com/audio.m4a',
      audioDurationSec: 12.5,
      prompt: 'What vibe does this photo give you?',
      category: 'looks',
      focusAreas: ['first_look'],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const parsedPost = PostSchema.parse(postPayload);
    expect(parsedPost.audioMediaUrl).toBe('https://cdn.example.com/audio.m4a');
    expect(parsedPost.audioDurationSec).toBe(12.5);
  });

  it('validates written perspective without a photo schema', () => {
    const { CreatePostInputSchema, PostSchema } = require('@perspective/contracts');

    const input = {
      kind: 'text',
      prompt: 'What kind of first impression does my writing style give?',
      category: 'looks',
      focusAreas: ['first_look'],
    };

    const parsedInput = CreatePostInputSchema.parse(input);
    expect(parsedInput.kind).toBe('text');
    expect(parsedInput.mediaId).toBeUndefined();

    const postPayload = {
      id: 'e0000000-0000-0000-0000-000000000002',
      ownerId: 'f0000000-0000-0000-0000-000000000001',
      position: 1,
      kind: 'text',
      mediaUrl: null,
      durationSec: null,
      audioMediaUrl: null,
      audioDurationSec: null,
      prompt: 'What kind of first impression does my writing style give?',
      category: 'looks',
      focusAreas: ['first_look'],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const parsedPost = PostSchema.parse(postPayload);
    expect(parsedPost.kind).toBe('text');
    expect(parsedPost.mediaUrl).toBeNull();
  });

  it('validates standalone voice perspective without a photo schema', () => {
    const { CreatePostInputSchema, PostSchema } = require('@perspective/contracts');

    const input = {
      kind: 'audio',
      mediaId: 'a0000000-0000-0000-0000-000000000003',
      prompt: 'What does my voice and accent sound like to you?',
      category: 'voice',
      focusAreas: ['tone', 'warmth'],
    };

    const parsedInput = CreatePostInputSchema.parse(input);
    expect(parsedInput.kind).toBe('audio');
    expect(parsedInput.mediaId).toBe('a0000000-0000-0000-0000-000000000003');

    const postPayload = {
      id: 'e0000000-0000-0000-0000-000000000003',
      ownerId: 'f0000000-0000-0000-0000-000000000001',
      position: 2,
      kind: 'audio',
      mediaUrl: 'https://cdn.example.com/voice.m4a',
      durationSec: 8.2,
      audioMediaUrl: null,
      audioDurationSec: null,
      prompt: 'What does my voice and accent sound like to you?',
      category: 'voice',
      focusAreas: ['tone', 'warmth'],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const parsedPost = PostSchema.parse(postPayload);
    expect(parsedPost.kind).toBe('audio');
    expect(parsedPost.durationSec).toBe(8.2);
  });
});
