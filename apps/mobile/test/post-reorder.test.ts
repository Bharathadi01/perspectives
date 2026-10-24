import type { Post } from '@perspective/contracts';
import { canRemovePost, movePost } from '../src/features/profile-editor/reorder';

function post(id: string, kind: Post['kind'], position: number): Post {
  return {
    id,
    ownerId: 'owner',
    position,
    kind,
    mediaUrl: kind === 'photo' ? `https://cdn.example.com/${id}.jpg` : null,
    durationSec: kind === 'audio' ? 14 : null,
    audioMediaUrl: null,
    audioDurationSec: null,
    prompt: 'What would you assume about me?',
    category: 'looks',
    focusAreas: [],
    createdAt: '2026-10-25T00:00:00.000Z',
  } as unknown as Post;
}

/** photo, audio, text — the mixed profile the editor has to keep legal. */
const mixed = (): Post[] => [post('p1', 'photo', 0), post('a1', 'audio', 1), post('t1', 'text', 2)];

describe('movePost', () => {
  it('does nothing when the card has not moved', () => {
    expect(movePost(mixed(), 1, 1)).toBeNull();
  });

  it('refuses an index outside the list', () => {
    expect(movePost(mixed(), 5, 0)).toEqual({ error: 'out_of_range' });
    expect(movePost(mixed(), 0, -1)).toEqual({ error: 'out_of_range' });
  });

  it('refuses to put a non-photo in the leading slot', () => {
    expect(movePost(mixed(), 1, 0)).toEqual({ error: 'slot0_must_be_photo' });
    expect(movePost(mixed(), 2, 0)).toEqual({ error: 'slot0_must_be_photo' });
  });

  it('refuses a move that would displace the only photo from the lead', () => {
    // Moving the one photo out of slot 0 leaves a non-photo leading the profile.
    expect(movePost(mixed(), 0, 2)).toEqual({ error: 'slot0_must_be_photo' });
  });

  it('moves a card and renumbers every position', () => {
    const result = movePost(mixed(), 2, 1);
    expect(result).not.toBeNull();
    if (!result || 'error' in result) throw new Error('expected a reorder');
    expect(result.posts.map((p) => p.id)).toEqual(['p1', 't1', 'a1']);
    expect(result.posts.map((p) => p.position)).toEqual([0, 1, 2]);
  });

  it('lets a second photo take the lead', () => {
    const posts = [post('p1', 'photo', 0), post('a1', 'audio', 1), post('p2', 'photo', 2)];
    const result = movePost(posts, 2, 0);
    if (!result || 'error' in result) throw new Error('expected a reorder');
    expect(result.posts.map((p) => p.id)).toEqual(['p2', 'p1', 'a1']);
    expect(result.posts[0].kind).toBe('photo');
  });

  it('leaves the original array untouched', () => {
    const posts = mixed();
    movePost(posts, 2, 1);
    expect(posts.map((p) => p.id)).toEqual(['p1', 'a1', 't1']);
  });
});

describe('canRemovePost', () => {
  it('keeps the last card', () => {
    expect(canRemovePost([post('p1', 'photo', 0)], 'p1')).toBe('last_card');
  });

  it('keeps the last photo', () => {
    expect(canRemovePost(mixed(), 'p1')).toBe('last_photo');
  });

  it('allows removing a non-photo', () => {
    expect(canRemovePost(mixed(), 'a1')).toBeNull();
  });

  it('allows removing a photo when another remains', () => {
    const posts = [post('p1', 'photo', 0), post('p2', 'photo', 1)];
    expect(canRemovePost(posts, 'p1')).toBeNull();
  });
});
