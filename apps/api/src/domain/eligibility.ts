import type { Gender, Goal, ProfileRequirement } from '@perspective/contracts';

export interface AudienceRule {
  genders: readonly Gender[];
  minAge: number | null;
  maxAge: number | null;
}

export interface AudiencePerson {
  gender: Gender | null;
  age: number;
  audience: AudienceRule;
}

/** True when `person` falls inside `audience` (gender and age range). */
export function audienceIncludes(audience: AudienceRule, person: Pick<AudiencePerson, 'gender' | 'age'>): boolean {
  if (person.gender === null || audience.minAge === null || audience.maxAge === null) return false;
  return audience.genders.includes(person.gender) && person.age >= audience.minAge && person.age <= audience.maxAge;
}

/**
 * Two people can see each other when each is inside the other's audience.
 * assumption: the viewer's own audience doubles as their viewing filter, so nobody is shown
 * profiles outside the range they chose for themselves.
 */
export function mutuallyVisible(a: AudiencePerson, b: AudiencePerson): boolean {
  return audienceIncludes(a.audience, b) && audienceIncludes(b.audience, a);
}

export interface CompletenessInput {
  displayName: string | null;
  gender: Gender | null;
  heightCm: number | null;
  city: string | null;
  goals: readonly Goal[];
  audience: AudienceRule;
  selfieVerified: boolean;
  hasPrimaryPhotoPost: boolean;
}

/**
 * What is still missing before a profile can go live. Empty means live. Orientation is optional
 * (decided 2026-10-20); the goal is required.
 */
export function missingRequirements(p: CompletenessInput): ProfileRequirement[] {
  const missing: ProfileRequirement[] = [];
  if (!p.displayName || !p.gender || !p.heightCm || !p.city) missing.push('basics');
  if (p.goals.length === 0) missing.push('goal');
  if (p.audience.genders.length === 0 || p.audience.minAge === null || p.audience.maxAge === null) {
    missing.push('audience');
  }
  if (!p.selfieVerified) missing.push('selfie');
  if (!p.hasPrimaryPhotoPost) missing.push('primary_photo_post');
  return missing;
}
