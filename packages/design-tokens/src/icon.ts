/** Icon sizes. Replaces the fifteen raw Ionicons numbers the app used to carry. */
export const iconSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  hero: 32,
  display: 48,
} as const;

export type IconSize = typeof iconSize;
