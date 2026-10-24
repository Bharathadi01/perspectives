import { borderWidth, elevation, iconSize, motion, opacity, textStyles, touchTarget } from '@perspective/design-tokens';

describe('design tokens', () => {
  it('keeps a comfortable target alongside the 48px minimum', () => {
    expect(touchTarget.min).toBeGreaterThanOrEqual(48);
    expect(touchTarget.comfortable).toBe(44);
  });

  it('never defines text below 11px', () => {
    for (const [name, style] of Object.entries(textStyles)) {
      expect(`${name}:${style.fontSize}`).toBe(`${name}:${Math.max(11, style.fontSize)}`);
    }
  });

  it('gives every text style an absolute line height', () => {
    for (const style of Object.values(textStyles)) {
      // React Native rejects the unitless multipliers in typography.lineHeight.
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it('exposes one shadow recipe per elevation name', () => {
    for (const recipe of Object.values(elevation)) {
      expect(recipe.shadowOpacity).toBeGreaterThan(0);
      expect(recipe.elevation).toBeGreaterThan(0);
    }
  });

  it('keeps reduced motion no slower than normal motion', () => {
    expect(motion.reduced.duration.base).toBeLessThan(motion.duration.base);
    expect(motion.reduced.duration.fast).toBeLessThanOrEqual(motion.duration.fast);
  });

  it('exposes the scales screens used to hard-code', () => {
    expect(iconSize.base).toBe(16);
    expect(borderWidth.hairline).toBe(1);
    expect(opacity.disabled).toBeLessThan(opacity.pressed);
  });
});
