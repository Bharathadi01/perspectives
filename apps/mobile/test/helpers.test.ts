import { ApiError } from '@perspective/api-client';
import { errorMessage } from '../src/lib/errors';
import { formatDuration, formatHeight, timeAgo } from '../src/lib/labels';
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

describe('labels', () => {
  it('formats height in feet and centimetres', () => {
    expect(formatHeight(178)).toBe(`5'10" · 178 cm`);
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
