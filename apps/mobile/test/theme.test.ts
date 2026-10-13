import { theme } from '../src/theme';

describe('Mobile Theme & Tokens Integrity', () => {
  it('has authoritative color tokens from design system', () => {
    expect(theme.colors.background).toBe('#F7F4EE');
    expect(theme.colors.surface).toBe('#FFFFFF');
    expect(theme.colors.ink).toBe('#17171B');
    expect(theme.colors.muted).toBe('#6E6C73');
    expect(theme.colors.brand).toBe('#5B4BDB');
    expect(theme.colors.success).toBe('#287A5B');
    expect(theme.colors.warning).toBe('#B86B20');
    expect(theme.colors.danger).toBe('#B33A3A');
  });

  it('enforces accessible touch target minimum of 48px', () => {
    expect(theme.touchTarget.min).toBeGreaterThanOrEqual(44);
    expect(theme.radius.card).toBe(24);
    expect(theme.radius.control).toBe(14);
  });

  it('matches spacing scale', () => {
    expect(theme.spacing.xs).toBe(4);
    expect(theme.spacing.sm).toBe(8);
    expect(theme.spacing.md).toBe(12);
    expect(theme.spacing.base).toBe(16);
    expect(theme.spacing.lg).toBe(24);
    expect(theme.spacing.xl).toBe(32);
    expect(theme.spacing.xxl).toBe(48);
  });
});
