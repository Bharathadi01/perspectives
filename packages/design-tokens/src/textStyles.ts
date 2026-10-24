import { typography } from './typography';

const { fontSize, fontWeight } = typography;

/**
 * Composed roles, so screens stop re-assembling size + weight + line height by
 * hand. Line heights are absolute pixels because React Native does not accept
 * the unitless multipliers in `typography.lineHeight`.
 *
 * Nothing here goes below 11px, which is the floor small labels may use.
 */
export const textStyles = {
  display: { fontSize: fontSize.hero, fontWeight: fontWeight.bold, lineHeight: 41, letterSpacing: -0.4 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, lineHeight: 29, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, lineHeight: 28 },
  bodyStrong: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, lineHeight: 22 },
  body: { fontSize: fontSize.base, fontWeight: fontWeight.regular, lineHeight: 22 },
  callout: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, lineHeight: 20 },
  calloutStrong: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: 20 },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, lineHeight: 17 },
  /** Section captions: uppercase is applied by the component, not the token. */
  overline: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, lineHeight: 14, letterSpacing: 0.9 },
  micro: { fontSize: fontSize.micro, fontWeight: fontWeight.regular, lineHeight: 14 },
} as const;

export type TextStyles = typeof textStyles;
