import { colors } from './colors';

/**
 * Shadow recipes. Before these existed every card re-invented its own, so the
 * app carried six different shadow opacities; use a name, not a number.
 */
export const elevation = {
  /** Resting cards and list groups. */
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** Pressed-but-not-moving, and the segmented control thumb. */
  raised: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  /** A card lifted by a drag. */
  float: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  /** Sheets and toasts. */
  overlay: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
} as const;

export type Elevation = typeof elevation;
