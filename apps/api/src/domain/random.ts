/**
 * Seeded randomness for assignment, so the same viewer, day and slot always give the same pick
 * (reproducible and testable) while different viewers spread out.
 */

/** FNV-1a 32-bit hash of a string. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic number in [0, 1) for `seed` (mulberry32 step). */
export function seededUnit(seed: string): number {
  let t = (hashSeed(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Picks one item with probability proportional to its weight, deterministically for `seed`. */
export function weightedPick<T>(items: readonly T[], weight: (item: T) => number, seed: string): T | null {
  if (items.length === 0) return null;
  const weights = items.map((item) => Math.max(0, weight(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[0];
  let target = seededUnit(seed) * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target < 0) return items[i];
  }
  return items[items.length - 1];
}
