/** Calendar day (YYYY-MM-DD) of `date` in `timeZone`. */
export function dayKeyFor(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Today's key in the app timezone. Server time is canonical. */
export function todayKey(timeZone: string, now: Date = new Date()): string {
  return dayKeyFor(now, timeZone);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
