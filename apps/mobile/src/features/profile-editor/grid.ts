import { RULES } from '@perspective/contracts';

/**
 * The card grid's shape: three across, two rows, so all six slots fit on one
 * screen as a set. The tiles are portrait rather than square, which gives each
 * photo a third more room than a square tile of the same width, and they carry
 * no text: the question is read on the card itself, not squeezed onto a thumbnail.
 */
export const GRID = {
  columns: 3,
  slots: RULES.maxPosts,
  gap: 8,
  /** Portrait, like the photos people actually post. Height = width × this. */
  tileAspect: 4 / 3,
} as const;

export interface GridGeometry {
  columnWidth: number;
  tileHeight: number;
  /** Distance from one row's top to the next row's top. */
  rowStride: number;
  /** Distance from one column's left edge to the next column's. */
  colStride: number;
  rows: number;
}

export function gridGeometry(width: number): GridGeometry {
  const columnWidth = (width - GRID.gap * (GRID.columns - 1)) / GRID.columns;
  const tileHeight = columnWidth * GRID.tileAspect;
  return {
    columnWidth,
    tileHeight,
    rowStride: tileHeight + GRID.gap,
    colStride: columnWidth + GRID.gap,
    rows: Math.ceil(GRID.slots / GRID.columns),
  };
}

export function slotOrigin(geom: GridGeometry, index: number): { x: number; y: number } {
  return {
    x: (index % GRID.columns) * geom.colStride,
    y: Math.floor(index / GRID.columns) * geom.rowStride,
  };
}

/** The slot under a point in grid coordinates, or null when outside the grid. */
export function slotAtPoint(geom: GridGeometry, x: number, y: number): number | null {
  if (x < 0 || y < 0) return null;
  const col = Math.floor(x / geom.colStride);
  const row = Math.floor(y / geom.rowStride);
  if (col >= GRID.columns || row >= geom.rows) return null;
  const index = row * GRID.columns + col;
  return index < GRID.slots ? index : null;
}

/**
 * Where a dragged card is pointing: the slot under its centre, but only a slot
 * that holds a card — dropping onto an empty slot changes nothing.
 */
export function dropTarget(
  geom: GridGeometry,
  from: number,
  dx: number,
  dy: number,
  filled: number,
): number | null {
  const origin = slotOrigin(geom, from);
  const target = slotAtPoint(
    geom,
    origin.x + dx + geom.columnWidth / 2,
    origin.y + dy + geom.tileHeight / 2,
  );
  return target !== null && target < filled ? target : null;
}

/** Where one row of a vertical list sits, measured from the top of the list. */
export interface RowFrame {
  y: number;
  height: number;
}

/**
 * The row a dragged row is over: the one under the dragged row's centre.
 * Rows differ in height (a question may take one line or two), so this works
 * from measured frames rather than a fixed stride.
 */
export function rowDropTarget(rows: readonly (RowFrame | undefined)[], from: number, dy: number): number | null {
  const start = rows[from];
  if (!start) return null;
  const centre = start.y + start.height / 2 + dy;
  const index = rows.findIndex((row) => !!row && centre >= row.y && centre < row.y + row.height);
  return index >= 0 ? index : null;
}
