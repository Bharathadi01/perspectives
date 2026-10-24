import {
  CATEGORY_CATALOG,
  RULES,
  type CreatePostInput,
  type PostCategory,
  type PostKind,
} from '@perspective/contracts';

/** Which screens a composer shows, in order, for the kind of card being made. */
export type ComposerStep = 'photo' | 'question' | 'voice';

export interface ComposerState {
  kind: PostKind;
  prompt: string;
  category: PostCategory;
  focusAreas: string[];
  hasPhoto: boolean;
  hasRecording: boolean;
}

export function stepsFor(kind: PostKind): ComposerStep[] {
  if (kind === 'photo') return ['photo', 'question', 'voice'];
  if (kind === 'audio') return ['question', 'voice'];
  return ['question'];
}

/**
 * The focus areas that belong to a category.
 *
 * Changing the category used to leave the old focus areas in place, which
 * produced a payload the server rejects ("Not a focus area of looks: tone").
 * Every category change goes through here instead.
 */
export function defaultFocusAreas(category: PostCategory): string[] {
  const first = CATEGORY_CATALOG[category].focusAreas[0];
  return first ? [first.key] : [];
}

export function focusAreasBelongTo(category: PostCategory, focusAreas: readonly string[]): boolean {
  const allowed = CATEGORY_CATALOG[category].focusAreas.map((f) => f.key);
  return focusAreas.every((key) => allowed.includes(key));
}

/** Keeps what still fits the new category, rather than silently dropping everything. */
export function reconcileFocusAreas(category: PostCategory, focusAreas: readonly string[]): string[] {
  const allowed = CATEGORY_CATALOG[category].focusAreas.map((f) => f.key);
  const kept = focusAreas.filter((key) => allowed.includes(key));
  return kept.length > 0 ? kept : defaultFocusAreas(category);
}

export function toggleFocusArea(focusAreas: readonly string[], key: string): string[] | 'at_min' | 'at_max' {
  if (focusAreas.includes(key)) {
    if (focusAreas.length <= RULES.minFocusAreas) return 'at_min';
    return focusAreas.filter((k) => k !== key);
  }
  if (focusAreas.length >= RULES.maxFocusAreas) return 'at_max';
  return [...focusAreas, key];
}

/** Why a step cannot be left yet. `null` means it is complete. */
export type StepProblem = 'no_photo' | 'prompt_too_short' | 'no_focus_area' | 'no_recording';

export const STEP_PROBLEM_MESSAGE: Record<StepProblem, string> = {
  no_photo: 'Choose a photo first.',
  prompt_too_short: `Your question needs at least ${RULES.promptMinLength} characters.`,
  no_focus_area: 'Pick at least one thing for people to focus on.',
  no_recording: 'Record your voice note first.',
};

export function problemWithStep(step: ComposerStep, state: ComposerState): StepProblem | null {
  if (step === 'photo') return state.hasPhoto ? null : 'no_photo';
  if (step === 'question') {
    if (state.prompt.trim().length < RULES.promptMinLength) return 'prompt_too_short';
    if (state.focusAreas.length < RULES.minFocusAreas) return 'no_focus_area';
    return null;
  }
  // Voice is optional on a photo card and required on a voice-only card.
  if (state.kind === 'audio' && !state.hasRecording) return 'no_recording';
  return null;
}

export function buildCreateInput(
  state: ComposerState,
  media: { mediaId?: string | null; audioMediaId?: string | null },
): CreatePostInput {
  return {
    kind: state.kind,
    mediaId: media.mediaId ?? null,
    audioMediaId: media.audioMediaId ?? null,
    prompt: state.prompt.trim(),
    category: state.category,
    focusAreas: state.focusAreas,
  };
}
