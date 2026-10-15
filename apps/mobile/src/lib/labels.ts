import type { Gender, NotHelpfulReason, Orientation, ReportReason } from '@perspective/contracts';

export const GENDER_LABEL: Record<Gender, string> = { woman: 'Woman', man: 'Man', non_binary: 'Non-binary' };

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

export function formatDuration(sec: number | null): string {
  if (sec === null) return '';
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
