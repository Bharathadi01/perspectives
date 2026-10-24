import { base32Decode, base32Encode, hotp, otpauthUri, totpCode, verifyTotp } from '../../src/admin/totp';
import {
  DEFAULT_QUALITY_POLICY,
  QualityMark,
  assessGiver,
  banEndsAt,
  extendedEnd,
  holdReason,
  isHarshMarker,
  isRestricted,
  isSeriousReason,
  reportReasonForMark,
  shouldFlagWeakGiver,
  suspensionOver,
} from '../../src/domain/enforcement';

const NOW = new Date('2026-10-21T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000);

describe('holds (decided 2026-10-20)', () => {
  it('holds after 3 different reporters, or at once for one credible serious report', () => {
    expect(holdReason(2, false, 3)).toBeNull();
    expect(holdReason(3, false, 3)).toBe('reporters');
    expect(holdReason(0, true, 3)).toBe('serious_report');
    expect(holdReason(5, false, 0)).toBeNull();
  });

  it('treats sexual content, threats, possibly under 18 and self-harm as serious', () => {
    expect(isSeriousReason('nudity_sexual')).toBe(true);
    expect(isSeriousReason('threat_violence')).toBe(true);
    expect(isSeriousReason('underage')).toBe(true);
    expect(isSeriousReason('self_harm')).toBe(true);
    expect(isSeriousReason('body_shaming')).toBe(false);
    expect(isSeriousReason('spam')).toBe(false);
  });
});

describe('"not helpful" marks that count as reports (decided 2026-10-21)', () => {
  it('turns insulting into one report and sexual or unsafe into serious reports', () => {
    expect(reportReasonForMark('insulting')).toBe('body_shaming');
    expect(reportReasonForMark('sexual')).toBe('nudity_sexual');
    expect(reportReasonForMark('unsafe')).toBe('threat_violence');
    expect(isSeriousReason(reportReasonForMark('insulting')!)).toBe(false);
    expect(isSeriousReason(reportReasonForMark('sexual')!)).toBe(true);
    expect(isSeriousReason(reportReasonForMark('unsafe')!)).toBe(true);
  });

  it('never turns low-effort reasons into reports', () => {
    expect(reportReasonForMark('vague')).toBeNull();
    expect(reportReasonForMark('irrelevant')).toBeNull();
    expect(reportReasonForMark('spam')).toBeNull();
  });
});

describe('the weak-giver line (decided 2026-10-21: fixed 60% line)', () => {
  const low = (marker: string, at = daysAgo(1)): QualityMark => ({ markerId: marker, kind: 'low_effort', at });
  const good = (marker: string, at = daysAgo(1)): QualityMark => ({ markerId: marker, kind: 'helpful', at });
  const people = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

  it('is weak only with 8+ low-effort marks from 5+ people and more than 60% low-effort', () => {
    const marks = [...people(8).map((p) => low(p)), ...people(4).map((p) => good(`h${p}`))];
    const a = assessGiver(marks, new Set(), NOW);
    expect(a).toMatchObject({ weak: true, lowEffort: 8, helpful: 4, lowEffortMarkers: 8 });
    expect(a.share).toBeCloseTo(8 / 12);
  });

  it('is not judged below 8 low-effort marks or below 5 different people', () => {
    expect(assessGiver(people(7).map((p) => low(p)), new Set(), NOW).weak).toBe(false);
    const fourPeople = [...people(4), 'p0', 'p1', 'p2', 'p3'].map((p) => low(p));
    expect(assessGiver(fourPeople, new Set(), NOW).weak).toBe(false);
  });

  it('is not weak at exactly 60% or below', () => {
    const marks = [...people(9).map((p) => low(p)), ...people(6).map((p) => good(`h${p}`))];
    expect(assessGiver(marks, new Set(), NOW).share).toBeCloseTo(0.6);
    expect(assessGiver(marks, new Set(), NOW).weak).toBe(false);
  });

  it('counts harsh markers at half weight', () => {
    expect(isHarshMarker(9, 10)).toBe(true);
    expect(isHarshMarker(8, 10)).toBe(false);
    expect(isHarshMarker(9, 9)).toBe(false); // fewer than 10 marks: not judged harsh
    // 8 low-effort (4 from harsh markers) vs 4 helpful: weighted 6 / 10 = 60%, so not over the line.
    const marks = [...people(8).map((p) => low(p)), ...people(4).map((p) => good(`h${p}`))];
    const a = assessGiver(marks, new Set(['p0', 'p1', 'p2', 'p3']), NOW);
    expect(a.share).toBeCloseTo(0.6);
    expect(a.weak).toBe(false);
  });

  it('lets marks fade after 45 days', () => {
    const old = people(10).map((p) => low(p, daysAgo(46)));
    expect(assessGiver(old, new Set(), NOW)).toMatchObject({ weak: false, lowEffort: 0 });
    expect(DEFAULT_QUALITY_POLICY.fadeDays).toBe(45);
  });

  it('flags for the admin after 10 more low-effort marks from 5+ people while still weak', () => {
    const tip = daysAgo(10);
    const before = people(8).map((p) => low(p, daysAgo(12)));
    const after9 = people(9).map((p) => low(`n${p}`, daysAgo(2)));
    expect(shouldFlagWeakGiver([...before, ...after9], tip, true)).toBe(false);
    const after10 = people(10).map((p) => low(`n${p}`, daysAgo(2)));
    expect(shouldFlagWeakGiver([...before, ...after10], tip, true)).toBe(true);
    expect(shouldFlagWeakGiver([...before, ...after10], tip, false)).toBe(false);
    const twoPeople = Array.from({ length: 10 }, (_, i) => low(i % 2 ? 'a' : 'b', daysAgo(2)));
    expect(shouldFlagWeakGiver(twoPeople, tip, true)).toBe(false);
  });
});

describe('bans', () => {
  it('knows when a ban is in force and when a temporary one is over', () => {
    expect(isRestricted('active', null, NOW)).toBe(false);
    expect(isRestricted('banned', null, NOW)).toBe(true);
    expect(isRestricted('suspended', banEndsAt(NOW, 3), NOW)).toBe(true);
    expect(isRestricted('suspended', daysAgo(1), NOW)).toBe(false);
    expect(suspensionOver('suspended', daysAgo(1), NOW)).toBe(true);
    expect(suspensionOver('suspended', banEndsAt(NOW, 1), NOW)).toBe(false);
    expect(suspensionOver('banned', daysAgo(1), NOW)).toBe(false);
  });

  it('extends by 3 days from the current end, or from now if it already passed (decided 2026-10-21)', () => {
    const end = banEndsAt(NOW, 2);
    expect(extendedEnd(end, NOW, 3).getTime()).toBe(end.getTime() + 3 * 86400000);
    expect(extendedEnd(daysAgo(1), NOW, 3).getTime()).toBe(NOW.getTime() + 3 * 86400000);
  });
});

describe('authenticator codes (RFC 6238)', () => {
  // RFC 6238 appendix B, SHA-1 key "12345678901234567890", 8 digits; the last 6 digits are the 6-digit code.
  const rfcSecret = base32Encode(Buffer.from('12345678901234567890'));

  it('matches the RFC test vectors', () => {
    expect(base32Decode(rfcSecret).toString()).toBe('12345678901234567890');
    expect(hotp(Buffer.from('12345678901234567890'), 1, 8)).toBe('94287082');
    expect(totpCode(rfcSecret, new Date(59 * 1000))).toBe('287082');
    expect(totpCode(rfcSecret, new Date(1111111109 * 1000))).toBe('081804');
    expect(totpCode(rfcSecret, new Date(1234567890 * 1000))).toBe('005924');
    expect(totpCode(rfcSecret, new Date(2000000000 * 1000))).toBe('279037');
  });

  it('accepts one step of clock drift, refuses other codes and reused ones', () => {
    const now = new Date(1234567890 * 1000);
    const code = totpCode(rfcSecret, now);
    const step = verifyTotp(rfcSecret, code, now);
    expect(step).not.toBeNull();
    expect(verifyTotp(rfcSecret, code, new Date(now.getTime() + 30000))).toBe(step);
    expect(verifyTotp(rfcSecret, code, new Date(now.getTime() + 90000))).toBeNull();
    expect(verifyTotp(rfcSecret, code, now, step)).toBeNull();
    expect(verifyTotp(rfcSecret, '12345', now)).toBeNull();
    expect(verifyTotp(rfcSecret, 'abcdef', now)).toBeNull();
  });

  it('builds the authenticator link', () => {
    expect(otpauthUri('jana@example.com', 'ABC')).toBe(
      'otpauth://totp/Perspective%20Admin%3Ajana%40example.com?secret=ABC&issuer=Perspective%20Admin&algorithm=SHA1&digits=6&period=30',
    );
  });
});
