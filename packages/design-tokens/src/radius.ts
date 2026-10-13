export const radius = {
  card: 24,
  control: 14,
  pill: 999,
  sm: 8,
} as const;

export const touchTarget = {
  min: 48,
} as const;

export type Radius = typeof radius;
