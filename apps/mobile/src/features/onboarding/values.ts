import { RULES, ageFromBirthDate } from '@perspective/contracts';

/** Height, birthday and labels for the onboarding questions. Pure, so they are unit-tested. */

const CM_PER_INCH = 2.54;

export function cmFromFeetInches(feet: number, inches: number): number {
  return clampHeight(Math.round((feet * 12 + inches) * CM_PER_INCH));
}

export function feetInchesFromCm(cm: number): { feet: number; inches: number } {
  const total = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(total / 12), inches: total % 12 };
}

export function clampHeight(cm: number): number {
  return Math.min(RULES.heightCmMax, Math.max(RULES.heightCmMin, cm));
}

/** 165 → 5′5″ (typographic primes, as on the profile cards). */
export function formatFeetInchesPrimes(cm: number): string {
  const { feet, inches } = feetInchesFromCm(cm);
  return `${feet}′${inches}″`;
}

/** The wheel choices: 4′ to 7′ covers the allowed 120 to 230 cm. */
export const FEET_CHOICES = [4, 5, 6, 7] as const;
export const INCH_CHOICES = Array.from({ length: 12 }, (_, i) => i);
export const CM_CHOICES = Array.from({ length: RULES.heightCmMax - RULES.heightCmMin + 1 }, (_, i) => RULES.heightCmMin + i);

/** A typical starting height for the wheel before anyone picks: 5′6″. */
export const DEFAULT_HEIGHT_CM = 168;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Day, month and year as typed → `YYYY-MM-DD`, or null when it is not a real date (31 February)
 * or lies in the future. Two-digit years are not guessed: the year box takes four digits.
 */
export function birthDateFrom(day: string, month: string, year: string, today: Date = new Date()): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (date.getTime() > today.getTime()) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** `2001-03-14` → `14 March 2001`. */
export function formatLongDate(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export type BirthdayCheck = { ok: true; birthDate: string; age: number } | { ok: false; message: string };

export function checkBirthday(day: string, month: string, year: string, today: Date = new Date()): BirthdayCheck {
  const birthDate = birthDateFrom(day, month, year, today);
  if (!birthDate) return { ok: false, message: 'That date doesn’t look right. Check the day, month and year.' };
  const age = ageFromBirthDate(birthDate, today);
  if (age < RULES.minAge) return { ok: false, message: 'You must be 18 or older to use Perspective.' };
  return { ok: true, birthDate, age };
}

/** Where an age sits along the audience slider, 0 to 1 (18 to 99). */
export function ageToFraction(age: number): number {
  return (age - RULES.minAge) / (RULES.maxAudienceAge - RULES.minAge);
}

export function fractionToAge(fraction: number): number {
  return Math.round(RULES.minAge + Math.min(1, Math.max(0, fraction)) * (RULES.maxAudienceAge - RULES.minAge));
}

/** A simple shape check before the server's own; the server has the final say. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
