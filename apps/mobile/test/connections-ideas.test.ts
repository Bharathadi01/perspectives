import { CONVERSATION_IDEAS, type PostCategory } from '@perspective/contracts';
import { ideaCount, ideasForRound, starterFor } from '../src/features/connections/ideas';

const categories = Object.keys(CONVERSATION_IDEAS) as PostCategory[];

describe('starterFor', () => {
  it('has a hand-written first line for every idea the app can show', () => {
    const missing = categories.flatMap((c) =>
      (['giver', 'owner'] as const).flatMap((role) => CONVERSATION_IDEAS[c][role].filter((idea) => !starterFor(idea))),
    );
    expect(missing).toEqual([]);
  });

  it('returns null for text it does not know, so the card stays a hint', () => {
    expect(starterFor('Something new')).toBeNull();
  });
});

describe('ideasForRound', () => {
  it('opens on the same ideas the chat always showed', () => {
    expect(ideasForRound('style', 'giver', 'c1', 0)).toHaveLength(3);
    expect(ideasForRound('style', 'giver', 'c1', 0)).toEqual(ideasForRound('style', 'giver', 'c1', 0));
  });

  it('moves on to different ideas when shuffled', () => {
    const first = ideasForRound('style', 'giver', 'c1', 0);
    const next = ideasForRound('style', 'giver', 'c1', 1);
    expect(next[0]).not.toBe(first[0]);
    expect(new Set(next).size).toBe(next.length);
  });

  it('knows when there is nothing new to shuffle to', () => {
    expect(ideaCount('other', 'giver')).toBe(3);
    expect(ideasForRound('other', 'giver', 'c1', 4)).toEqual(ideasForRound('other', 'giver', 'c1', 0));
  });
});
