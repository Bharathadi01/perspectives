/** Geometry for the floating glass tab bar (GlassTabBar.tsx). Pure, so it is unit-tested. */

/** Space between the lens and the edge of its tab slot, in px. */
export const LENS_INSET = 4;

export function slotWidth(barWidth: number, count: number): number {
  return count > 0 ? barWidth / count : 0;
}

/** The tab under an x position on the bar (clamped to the first and last tab). */
export function tabIndexAt(x: number, barWidth: number, count: number): number {
  const w = slotWidth(barWidth, count);
  if (w <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(x / w)));
}

/** Left edge of the lens when it rests on a tab. */
export function lensLeft(index: number, barWidth: number, count: number): number {
  return index * slotWidth(barWidth, count) + LENS_INSET;
}

/** Left edge of the lens while a finger drags it: centred on the finger, kept inside the bar. */
export function lensLeftForFinger(x: number, barWidth: number, count: number): number {
  const lens = slotWidth(barWidth, count) - LENS_INSET * 2;
  return Math.min(barWidth - lens - LENS_INSET, Math.max(LENS_INSET, x - lens / 2));
}
