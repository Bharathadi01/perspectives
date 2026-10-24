export const opacity = {
  pressed: 0.8,
  disabled: 0.45,
  /** Secondary text or icons that should recede without losing contrast. */
  subtle: 0.6,
  scrim: 0.55,
  /** Behind prompt text sitting on a photo, where contrast has to hold. */
  mediaScrim: 0.78,
} as const;

export const scale = {
  pressed: 0.97,
  lifted: 1.04,
} as const;

export type Opacity = typeof opacity;
