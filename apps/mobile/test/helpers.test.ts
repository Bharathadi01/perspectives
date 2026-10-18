import { ApiError } from '@perspective/api-client';
import { errorMessage } from '../src/lib/errors';
import { formatDuration, formatHeight, normalizeDigits, timeAgo, timeUntil } from '../src/lib/labels';

describe('timeUntil', () => {
  const now = new Date('2026-10-18T10:00:00Z');
  const later = (mins: number) => new Date(now.getTime() + mins * 60000).toISOString();
  it('words a deadline plainly', () => {
    expect(timeUntil(later(20), now)).toBe('in under an hour');
    expect(timeUntil(later(65), now)).toBe('in about an hour');
    expect(timeUntil(later(5 * 60), now)).toBe('in 5 hours');
    expect(timeUntil(later(24 * 60), now)).toBe('in about a day');
    expect(timeUntil(later(3 * 24 * 60), now)).toBe('in 3 days');
  });
});
import { theme } from '../src/theme';

describe('design tokens', () => {
  it('keeps the brand palette and 48px touch targets', () => {
    expect(theme.colors.background).toBe('#F7F4EE');
    expect(theme.colors.ink).toBe('#17171B');
    expect(theme.colors.brand).toBe('#5B4BDB');
    expect(theme.touchTarget.min).toBeGreaterThanOrEqual(48);
    expect(theme.spacing.base).toBe(16);
  });
});

describe('labels and digits normalization', () => {
  it('formats height in feet and centimetres', () => {
    expect(formatHeight(178)).toBe(`5'10" · 178 cm`);
  });

  it('normalizes devanagari and international numerals to ascii digits', () => {
    expect(normalizeDigits('१७५')).toBe('175');
    expect(normalizeDigits('175 cm')).toBe('175');
    expect(normalizeDigits('१८०')).toBe('180');
    expect(normalizeDigits('abc')).toBe('');
  });

  it('formats short audio durations', () => {
    expect(formatDuration(6)).toBe('0:06');
    expect(formatDuration(15)).toBe('0:15');
    expect(formatDuration(null)).toBe('');
  });

  it('formats relative times', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    expect(timeAgo('2026-10-16T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-16T11:15:00Z', now)).toBe('45m');
    expect(timeAgo('2026-10-16T07:00:00Z', now)).toBe('5h');
    expect(timeAgo('2026-10-13T12:00:00Z', now)).toBe('3d');
  });
});

describe('error messages', () => {
  it('shows the server message for actionable business errors', () => {
    const err = new ApiError('PERSPECTIVE_REQUIRED_BEFORE_CONNECT', 'Give them a perspective first, then you can ask to connect.', 403);
    expect(errorMessage(err)).toBe('Give them a perspective first, then you can ask to connect.');
  });

  it('never leaks internal wording for unexpected failures', () => {
    expect(errorMessage(new ApiError('INTERNAL_ERROR', 'db exploded', 500))).toBe('Something went wrong. Please try again.');
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(errorMessage(new ApiError('NETWORK_ERROR', 'x', 0))).toMatch(/connection/);
  });
});
