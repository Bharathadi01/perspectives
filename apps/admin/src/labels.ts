import type { AdminQueueReason, ReportReason } from '@perspective/contracts';

export const QUEUE_REASON: Record<AdminQueueReason, string> = {
  serious_report: 'Serious report',
  appeal: 'Appeal',
  reporters: '3+ reporters',
  weak_giver: 'Weak giver',
};

export const REPORT_REASON: Record<ReportReason, string> = {
  nudity_sexual: 'Nudity or sexual content',
  body_shaming: 'Insulting or body shaming',
  harassment_hate: 'Harassment or hate',
  threat_violence: 'Threats or violence',
  self_harm: 'Self-harm',
  scam_impersonation: 'Scam or fake profile',
  underage: 'Might be under 18',
  spam: 'Spam',
  other: 'Something else',
};

export const ACTION_LABEL: Record<string, string> = {
  sign_in: 'Signed in',
  view_case: 'Viewed',
  dismiss: 'Dismissed',
  ban_temporary: '3-day ban',
  ban_permanent: 'Permanent ban',
  extend: 'Extended ban by 3 days',
  restore: 'Restored',
  appeal_upheld: 'Appeal: ban kept',
  appeal_restored: 'Appeal: ban lifted',
};
