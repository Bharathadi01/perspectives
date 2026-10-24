export const radius = {
  card: 24,
  /** Photo and audio post cards. */
  media: 14,
  control: 14,
  pill: 999,
  sm: 8,
} as const;

export const touchTarget = {
  min: 48,
  /** Allowed only where a control sits inside an already-48px row. */
  comfortable: 44,
} as const;

/** Floating round actions (skip, give perspective). */
export const iconButton = {
  large: 56,
  small: 44,
} as const;

export type Radius = typeof radius;
