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
} as const;

/** Floating round actions (skip, give perspective). */
export const iconButton = {
  large: 56,
  small: 44,
} as const;

export type Radius = typeof radius;
