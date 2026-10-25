import { Gender, type Audience, type Goal, type MyProfile } from '@perspective/contracts';
import { GOAL_LABEL } from '../../lib/labels';

const sameGenders = (a: readonly Gender[], b: readonly Gender[]) =>
  a.length === b.length && a.every((g) => b.includes(g));

/**
 * The audience to send, or null when nothing changed. The server rebuilds today's set whenever an
 * audience arrives (profiles.service.ts), so an unchanged one must never be sent.
 */
export function audienceUpdate(current: Audience | null | undefined, next: Audience): Audience | null {
  if (next.genders.length === 0) return null;
  if (current && sameGenders(current.genders, next.genders) && current.minAge === next.minAge && current.maxAge === next.maxAge) {
    return null;
  }
  return { genders: [...next.genders], minAge: next.minAge, maxAge: next.maxAge };
}

/** "Everyone", or the picked genders in canonical order ("Women, Men"). */
export function gendersSummary(genders: readonly Gender[]): string {
  if (genders.length === 0) return 'Not set';
  if (Gender.options.every((g) => genders.includes(g))) return 'Everyone';
  return Gender.options
    .filter((g) => genders.includes(g))
    .map((g) => GENDER_PLURAL[g])
    .join(', ');
}

const GENDER_PLURAL: Record<Gender, string> = { woman: 'Women', man: 'Men', non_binary: 'Non-binary people' };

export function ageSummary(audience: Audience | null | undefined): string {
  return audience ? `${audience.minAge}–${audience.maxAge}` : 'Not set';
}

export function goalSummary(goals: readonly Goal[]): string {
  return goals.length === 0 ? 'Not set' : goals.map((g) => GOAL_LABEL[g].title).join(' · ');
}

/** The three row values on the Your feed screen. */
export function feedSummary(me: Pick<MyProfile, 'audience' | 'goals'>) {
  return {
    showMe: gendersSummary(me.audience?.genders ?? []),
    age: ageSummary(me.audience),
    goal: goalSummary(me.goals),
  };
}
