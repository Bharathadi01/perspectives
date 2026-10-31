import { RULES } from '@perspective/contracts';
import { clearDraft, readDraft, readiness, saveDraft, toggleChip } from '../src/features/give/compose';

describe('readiness', () => {
  it('counts down to the minimum length, ignoring spaces at the ends', () => {
    expect(readiness('')).toEqual({ remaining: RULES.commentMinLength, ready: false, tooLong: false });
    expect(readiness('   ' + 'a'.repeat(10) + '   ').remaining).toBe(RULES.commentMinLength - 10);
  });

  it('is ready at the minimum and refuses past the maximum', () => {
    expect(readiness('a'.repeat(RULES.commentMinLength)).ready).toBe(true);
    expect(readiness('a'.repeat(RULES.commentMaxLength + 1))).toMatchObject({ ready: false, tooLong: true });
  });
});

describe('toggleChip', () => {
  it('adds and removes', () => {
    expect(toggleChip([], 'Warm')).toEqual({ next: ['Warm'], refused: false });
    expect(toggleChip(['Warm'], 'Warm')).toEqual({ next: [], refused: false });
  });

  it('refuses a new pick at the limit but still lets one be removed', () => {
    const full = ['A', 'B', 'C'].slice(0, RULES.maxChips);
    expect(toggleChip(full, 'D')).toEqual({ next: full, refused: true });
    expect(toggleChip(full, full[0]).next).toHaveLength(RULES.maxChips - 1);
  });
});

describe('drafts', () => {
  it('keeps unsent text per post and forgets empty drafts', () => {
    saveDraft('p1', { comment: 'Half a thought', chips: [], connect: true });
    expect(readDraft('p1')).toEqual({ comment: 'Half a thought', chips: [], connect: true });
    saveDraft('p1', { comment: '   ', chips: [], connect: false });
    expect(readDraft('p1')).toBeUndefined();
  });

  it('clears after sending', () => {
    saveDraft('p2', { comment: 'Text', chips: ['Warm'], connect: false });
    clearDraft('p2');
    expect(readDraft('p2')).toBeUndefined();
  });
});
