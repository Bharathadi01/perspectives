/**
 * Durations and spring configs. Plain numbers only: this package must stay
 * free of react-native so its tsc build keeps working. The Easing curves that
 * pair with these live in apps/mobile/src/theme/motion.ts.
 */
export const motion = {
  duration: {
    instant: 90,
    fast: 150,
    base: 220,
    slow: 320,
    /** How long a transient affordance stays on screen before it fades. */
    dwell: 2000,
  },
  spring: {
    gentle: { friction: 7, tension: 40 },
    snappy: { friction: 6, tension: 60 },
  },
  /** Substituted wholesale when the device asks for reduced motion. */
  reduced: {
    duration: { instant: 0, fast: 0, base: 120, slow: 160, dwell: 2000 },
  },
} as const;

export type Motion = typeof motion;
