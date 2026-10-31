import {
  borderWidth,
  colors,
  editorial,
  elevation,
  iconButton,
  iconSize,
  motion,
  opacity,
  radius,
  scale,
  spacing,
  textStyles,
  touchTarget,
  typography,
} from '@perspective/design-tokens';

const ef = editorial.fonts;

/**
 * The text roles of `textStyles` in the editorial look: the same sizes and line heights, in
 * Inter (one family per weight, so no fontWeight) and Fraunces for display type. For screens
 * moved to the editorial look (2026-10-31: the profile editor and the card composer).
 */
const editorialText = {
  display: { fontFamily: ef.display, fontSize: textStyles.display.fontSize, lineHeight: textStyles.display.lineHeight, letterSpacing: -0.4 },
  title: { fontFamily: ef.display, fontSize: textStyles.title.fontSize, lineHeight: textStyles.title.lineHeight },
  heading: { fontFamily: ef.display, fontSize: textStyles.heading.fontSize, lineHeight: textStyles.heading.lineHeight },
  bodyStrong: { fontFamily: ef.bodySemibold, fontSize: textStyles.bodyStrong.fontSize, lineHeight: textStyles.bodyStrong.lineHeight },
  body: { fontFamily: ef.body, fontSize: textStyles.body.fontSize, lineHeight: textStyles.body.lineHeight },
  callout: { fontFamily: ef.body, fontSize: textStyles.callout.fontSize, lineHeight: textStyles.callout.lineHeight },
  calloutStrong: { fontFamily: ef.bodySemibold, fontSize: textStyles.calloutStrong.fontSize, lineHeight: textStyles.calloutStrong.lineHeight },
  caption: { fontFamily: ef.body, fontSize: textStyles.caption.fontSize, lineHeight: textStyles.caption.lineHeight },
  overline: { fontFamily: ef.bodySemibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  touchTarget,
  iconButton,
  iconSize,
  typography,
  textStyles,
  elevation,
  motion,
  opacity,
  scale,
  borderWidth,
  editorial,
  editorialText,
};
export type Theme = typeof theme;
