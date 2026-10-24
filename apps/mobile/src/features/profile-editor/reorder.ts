import type { Post } from '@perspective/contracts';

/** Why a move or a removal was refused. Each maps to one message the person sees. */
export type ReorderError = 'out_of_range' | 'slot0_must_be_photo';
export type RemoveError = 'last_card' | 'last_photo';

export const REORDER_MESSAGE: Record<ReorderError, string> = {
  out_of_range: 'That card is no longer where it was. Try again.',
  slot0_must_be_photo: 'The top card (slot 1) must be a photo to introduce yourself.',
};

export const REMOVE_MESSAGE: Record<RemoveError, string> = {
  last_card: 'You must keep at least one card on your profile.',
  last_photo: 'You must keep at least one photo on your profile.',
};

/**
 * Moves a card and renumbers every position.
 *
 * The first card leads the profile and has to be a photo, which the server
 * enforces too. Returns null when nothing should change, so the caller can skip
 * the request entirely rather than letting the screen drift from what is saved.
 */
export function movePost(
  posts: readonly Post[],
  fromIndex: number,
  toIndex: number,
): { posts: Post[] } | { error: ReorderError } | null {
  if (fromIndex === toIndex) return null;
  if (fromIndex < 0 || fromIndex >= posts.length) return { error: 'out_of_range' };
  if (toIndex < 0 || toIndex >= posts.length) return { error: 'out_of_range' };

  if (toIndex === 0 && posts[fromIndex].kind !== 'photo') {
    return { error: 'slot0_must_be_photo' };
  }

  const next = [...posts];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  if (next[0]?.kind !== 'photo') return { error: 'slot0_must_be_photo' };

  return { posts: next.map((post, position) => ({ ...post, position })) };
}

/** Whether this card may go. A profile keeps at least one card and one photo. */
export function canRemovePost(posts: readonly Post[], postId: string): RemoveError | null {
  if (posts.length <= 1) return 'last_card';
  const target = posts.find((post) => post.id === postId);
  if (!target) return null;
  if (target.kind === 'photo' && posts.filter((post) => post.kind === 'photo').length <= 1) {
    return 'last_photo';
  }
  return null;
}

/**
 * Swaps two cards — what a drag in the grid does: you drop a card on another
 * and they trade places. The first card must still be a photo afterwards.
 */
export function swapPosts(
  posts: readonly Post[],
  a: number,
  b: number,
): { posts: Post[] } | { error: ReorderError } | null {
  if (a === b) return null;
  if (a < 0 || a >= posts.length || b < 0 || b >= posts.length) return { error: 'out_of_range' };

  const next = [...posts];
  [next[a], next[b]] = [next[b], next[a]];
  if (next[0]?.kind !== 'photo') return { error: 'slot0_must_be_photo' };

  return { posts: next.map((post, position) => ({ ...post, position })) };
}

/** Where each photo sits in the full card order, in order. The photo grid shows only these. */
export function photoIndices(posts: readonly Post[]): number[] {
  return posts.flatMap((post, index) => (post.kind === 'photo' ? [index] : []));
}

/**
 * Swaps two photos by their place in the photo grid. Voice and written cards
 * keep their places between the photos, so a photo drag never moves them.
 */
export function swapPhotos(
  posts: readonly Post[],
  a: number,
  b: number,
): { posts: Post[] } | { error: ReorderError } | null {
  const photos = photoIndices(posts);
  if (a === b) return null;
  if (a < 0 || a >= photos.length || b < 0 || b >= photos.length) return { error: 'out_of_range' };
  return swapPosts(posts, photos[a], photos[b]);
}

/** How many photos come before this card on the profile: a voice card at 2 shows "after photo 2". */
export function photosBefore(posts: readonly Post[], index: number): number {
  return posts.slice(0, index).filter((post) => post.kind === 'photo').length;
}

/** Where each voice or written card sits in the full card order. */
export function promptIndices(posts: readonly Post[]): number[] {
  return posts.flatMap((post, index) => (post.kind === 'photo' ? [] : [index]));
}

/**
 * Swaps two voice or written cards by their place in the list under the
 * photos. The photos keep their places, so a list drag never moves a photo.
 */
export function swapPrompts(
  posts: readonly Post[],
  a: number,
  b: number,
): { posts: Post[] } | { error: ReorderError } | null {
  const prompts = promptIndices(posts);
  if (a === b) return null;
  if (a < 0 || a >= prompts.length || b < 0 || b >= prompts.length) return { error: 'out_of_range' };
  return swapPosts(posts, prompts[a], prompts[b]);
}
