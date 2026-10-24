import { Easing } from 'react-native';
import { motion } from '@perspective/design-tokens';

/**
 * The Easing curves that pair with the duration tokens. These live here rather
 * than in the token package, which stays free of react-native so it can be
 * compiled by plain tsc.
 */
export const easing = {
  /** Entering: decelerate into place. */
  out: Easing.out(Easing.cubic),
  /** Leaving: accelerate away. */
  in: Easing.in(Easing.cubic),
  /** Moving between two on-screen positions. */
  inOut: Easing.inOut(Easing.cubic),
} as const;

export { motion };
