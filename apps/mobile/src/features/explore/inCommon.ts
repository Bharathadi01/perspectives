import {
  getInterestById,
  LIFESTYLE_PACE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
  type PublicProfile,
} from '@perspective/contracts';

export interface InCommonItem {
  kind: 'interest' | 'city' | 'lifestyle' | 'social';
  label: string;
}

type Side = Pick<PublicProfile, 'interests' | 'lifestylePace' | 'socialPreference'> & { city?: string | null };

const sameCity = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What the viewer and a profile share (decided 2026-10-25): interests, then same city, daily rhythm
 * and social energy. Only public answers on both sides; display only, never used for matching.
 */
export function thingsInCommon(me: Side, other: Side): InCommonItem[] {
  const items: InCommonItem[] = [];
  const mine = new Set(me.interests ?? []);
  for (const id of other.interests ?? []) {
    if (mine.has(id)) items.push({ kind: 'interest', label: getInterestById(id)?.label ?? id });
  }
  if (sameCity(me.city, other.city)) items.push({ kind: 'city', label: (other.city ?? '').trim() });
  if (me.lifestylePace && me.lifestylePace === other.lifestylePace) {
    items.push({ kind: 'lifestyle', label: LIFESTYLE_PACE_LABELS[other.lifestylePace].label });
  }
  if (me.socialPreference && me.socialPreference === other.socialPreference) {
    items.push({ kind: 'social', label: SOCIAL_PREFERENCE_LABELS[other.socialPreference].label });
  }
  return items;
}

/** "You + Tara have 4 things in common" / "1 thing". */
export function inCommonTitle(name: string, count: number): string {
  return `You + ${name} have ${count} ${count === 1 ? 'thing' : 'things'} in common`;
}
