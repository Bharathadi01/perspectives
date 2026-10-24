import type { Post } from '@perspective/contracts';
import { GRID, dropTarget, gridGeometry, rowDropTarget, slotAtPoint, slotOrigin } from '../src/features/profile-editor/grid';
import {
  photoIndices,
  photosBefore,
  promptIndices,
  swapPhotos,
  swapPosts,
  swapPrompts,
} from '../src/features/profile-editor/reorder';

function post(id: string, kind: Post['kind']): Post {
  return { id, kind, position: 0 } as unknown as Post;
}

// A 390pt phone with 16pt gutters gives a 358pt-wide grid.
const geom = gridGeometry(358);

describe('gridGeometry', () => {
  it('makes three portrait columns in two rows', () => {
    expect(geom.columnWidth).toBeCloseTo(114);
    expect(geom.tileHeight).toBeCloseTo(114 * GRID.tileAspect);
    expect(geom.rows).toBe(2);
  });

  it('gives each photo more room than a square tile of the same width', () => {
    expect(geom.tileHeight).toBeGreaterThan(geom.columnWidth * 1.3);
  });
});

describe('slotAtPoint', () => {
  it('finds each of the six slots by its centre', () => {
    for (let i = 0; i < GRID.slots; i += 1) {
      const o = slotOrigin(geom, i);
      expect(slotAtPoint(geom, o.x + geom.columnWidth / 2, o.y + geom.tileHeight / 2)).toBe(i);
    }
  });

  it('returns nothing outside the grid', () => {
    expect(slotAtPoint(geom, -5, 10)).toBeNull();
    expect(slotAtPoint(geom, 10, geom.rowStride * 2 + 5)).toBeNull();
    expect(slotAtPoint(geom, geom.colStride * 3 + 5, 10)).toBeNull();
  });
});

describe('dropTarget', () => {
  it('points at the card the dragged card is over', () => {
    // From slot 0, one column right is slot 1.
    expect(dropTarget(geom, 0, geom.colStride, 0, 6)).toBe(1);
    // From slot 0, one row down is slot 3.
    expect(dropTarget(geom, 0, 0, geom.rowStride, 6)).toBe(3);
  });

  it('ignores empty slots', () => {
    // Only three cards exist; slot 4 is empty.
    expect(dropTarget(geom, 0, geom.colStride, geom.rowStride, 3)).toBeNull();
  });

  it('stays on its own slot for a small wobble', () => {
    expect(dropTarget(geom, 3, 6, -8, 6)).toBe(3);
  });
});

describe('swapPosts', () => {
  const mixed = () => [post('p1', 'photo'), post('a1', 'audio'), post('p2', 'photo'), post('t1', 'text')];

  it('trades two cards and renumbers', () => {
    const result = swapPosts(mixed(), 1, 3);
    if (!result || 'error' in result) throw new Error('expected a swap');
    expect(result.posts.map((p) => p.id)).toEqual(['p1', 't1', 'p2', 'a1']);
    expect(result.posts.map((p) => p.position)).toEqual([0, 1, 2, 3]);
  });

  it('lets another photo take the lead', () => {
    const result = swapPosts(mixed(), 0, 2);
    if (!result || 'error' in result) throw new Error('expected a swap');
    expect(result.posts[0].id).toBe('p2');
  });

  it('refuses to put a non-photo first', () => {
    expect(swapPosts(mixed(), 0, 1)).toEqual({ error: 'slot0_must_be_photo' });
  });

  it('does nothing when dropped on itself', () => {
    expect(swapPosts(mixed(), 2, 2)).toBeNull();
  });

  it('refuses an index that does not exist', () => {
    expect(swapPosts(mixed(), 0, 9)).toEqual({ error: 'out_of_range' });
  });
});

describe('photo-only grid helpers', () => {
  const mixed = () => [post('p1', 'photo'), post('a1', 'audio'), post('p2', 'photo'), post('t1', 'text'), post('p3', 'photo')];

  it('lists where the photos are', () => {
    expect(photoIndices(mixed())).toEqual([0, 2, 4]);
  });

  it('swaps photos by their grid place and leaves voice and written cards where they were', () => {
    const result = swapPhotos(mixed(), 0, 2);
    if (!result || 'error' in result) throw new Error('expected a swap');
    expect(result.posts.map((p) => p.id)).toEqual(['p3', 'a1', 'p2', 't1', 'p1']);
    expect(result.posts.map((p) => p.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it('refuses a grid place that has no photo', () => {
    expect(swapPhotos(mixed(), 0, 3)).toEqual({ error: 'out_of_range' });
  });

  it('counts the photos before a card', () => {
    expect(photosBefore(mixed(), 1)).toBe(1);
    expect(photosBefore(mixed(), 3)).toBe(2);
  });
});

describe('voice and written list helpers', () => {
  const mixed = () => [post('p1', 'photo'), post('a1', 'audio'), post('p2', 'photo'), post('t1', 'text'), post('a2', 'audio')];

  it('lists where the voice and written cards are', () => {
    expect(promptIndices(mixed())).toEqual([1, 3, 4]);
  });

  it('swaps them by their list place and leaves the photos where they were', () => {
    const result = swapPrompts(mixed(), 0, 2);
    if (!result || 'error' in result) throw new Error('expected a swap');
    expect(result.posts.map((p) => p.id)).toEqual(['p1', 'a2', 'p2', 't1', 'a1']);
  });

  it('refuses a list place that does not exist', () => {
    expect(swapPrompts(mixed(), 0, 3)).toEqual({ error: 'out_of_range' });
  });
});

describe('rowDropTarget', () => {
  // A one-line row, a two-line row, a one-line row, 8pt apart.
  const rows = [
    { y: 0, height: 72 },
    { y: 80, height: 94 },
    { y: 182, height: 72 },
  ];

  it('stays on its own row for a small wobble', () => {
    expect(rowDropTarget(rows, 0, 10)).toBe(0);
  });

  it('finds the row below and the row above, whatever their heights', () => {
    expect(rowDropTarget(rows, 0, 100)).toBe(1);
    expect(rowDropTarget(rows, 2, -100)).toBe(1);
    expect(rowDropTarget(rows, 0, 190)).toBe(2);
  });

  it('points at nothing past the ends or in a gap', () => {
    expect(rowDropTarget(rows, 2, 200)).toBeNull();
    expect(rowDropTarget(rows, 0, 40)).toBeNull();
  });
});
