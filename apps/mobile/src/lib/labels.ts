import type { Gender, Goal, NotHelpfulReason, Orientation, ReportReason } from '@perspective/contracts';

export const GENDER_LABEL: Record<Gender, string> = { woman: 'Woman', man: 'Man', non_binary: 'Non-binary' };

/** The private onboarding goal (decided 2026-10-20). Never shown to anyone else. */
export const GOAL_LABEL: Record<Goal, { title: string; description: string }> = {
  get_perspectives: { title: 'Get perspectives', description: 'Hear honestly how you look, dress, sound and come across.' },
  meet_people: { title: 'Meet new people', description: 'Connect with people you get along with.' },
};

/** The audience question is worded by the goal (docs/PRODUCT.md → Audience). */
export function audienceQuestion(goals: readonly Goal[]): string {
  const perspectives = goals.includes('get_perspectives');
  const meet = goals.includes('meet_people');
  if (perspectives && !meet) return 'Whose perspectives do you want?';
  if (meet && !perspectives) return 'Who would you like to meet?';
  return 'Who do you want in your feed?';
}

/** True when the person only wants perspectives: their audience starts with every gender selected. */
export function perspectivesOnly(goals: readonly Goal[]): boolean {
  return goals.length === 1 && goals[0] === 'get_perspectives';
}

export const PERSPECTIVES_ONLY_HINT = 'Including more people brings you more perspectives, faster.';

export const ORIENTATION_LABEL: Record<Orientation, string> = {
  straight: 'Straight',
  gay: 'Gay',
  lesbian: 'Lesbian',
  bisexual: 'Bisexual',
  pansexual: 'Pansexual',
  queer: 'Queer',
  asexual: 'Asexual',
  prefer_not_to_say: 'Prefer not to say',
};

export const NOT_HELPFUL_LABEL: Record<NotHelpfulReason, string> = {
  vague: 'Vague or generic',
  irrelevant: 'Didn’t answer my question',
  insulting: 'Insulting or body shaming',
  sexual: 'Sexual or inappropriate',
  spam: 'Spam',
  unsafe: 'Unsafe',
};

export const REPORT_LABEL: Record<ReportReason, string> = {
  nudity_sexual: 'Nudity or sexual content',
  body_shaming: 'Body shaming',
  harassment_hate: 'Harassment or hate',
  threat_violence: 'Threats or violence',
  self_harm: 'Self-harm',
  scam_impersonation: 'Scam or fake profile',
  underage: 'Might be under 18',
  spam: 'Spam',
  other: 'Something else',
};

export function formatHeight(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}" · ${cm} cm`;
}

/** Normalizes any Unicode digits (Devanagari, Arabic-Indic, Fullwidth, etc.) to ASCII 0-9. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09E6))
    .replace(/[\u0A66-\u0A6F]/g, (d) => String(d.charCodeAt(0) - 0x0A66))
    .replace(/[\u0AE6-\u0AEF]/g, (d) => String(d.charCodeAt(0) - 0x0AE6))
    .replace(/[\u0B66-\u0B6F]/g, (d) => String(d.charCodeAt(0) - 0x0B66))
    .replace(/[\u0BE6-\u0BEF]/g, (d) => String(d.charCodeAt(0) - 0x0BE6))
    .replace(/[\u0C66-\u0C6F]/g, (d) => String(d.charCodeAt(0) - 0x0C66))
    .replace(/[\u0CE6-\u0CEF]/g, (d) => String(d.charCodeAt(0) - 0x0CE6))
    .replace(/[\u0D66-\u0D6F]/g, (d) => String(d.charCodeAt(0) - 0x0D66))
    .replace(/[\uFF10-\uFF19]/g, (d) => String(d.charCodeAt(0) - 0xFF10))
    .replace(/[^0-9]/g, '');
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '';
  const s = Math.round(sec);
  return `0:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** "in 5 hours", "in about a day", "in under an hour": for deadlines such as a quiet connection closing. */
export function timeUntil(iso: string, now: Date = new Date()): string {
  const mins = Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
  if (mins < 60) return 'in under an hour';
  const hours = Math.round(mins / 60);
  if (hours === 1) return 'in about an hour';
  if (hours < 22) return `in ${hours} hours`;
  if (hours < 36) return 'in about a day';
  return `in ${Math.round(hours / 24)} days`;
}
