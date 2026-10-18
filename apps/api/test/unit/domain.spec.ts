import { dayKeyFor } from '../../src/common/day';
import { pickDailySet, pickReplacement, AssignmentCandidate } from '../../src/domain/assignment';
import { cooldownUntil, evaluateAccept, evaluateConnect, ConnectState } from '../../src/domain/connect';
import { dailyStatus, isRevealed, mandatoryCount, requiredAfterUnfilledSlot } from '../../src/domain/daily';
import { audienceIncludes, missingRequirements, mutuallyVisible, AudiencePerson } from '../../src/domain/eligibility';
import { categoryAffinity, qualityPrior, rankingScore, reciprocityNeed } from '../../src/domain/ranking';

describe('audience and eligibility', () => {
  const womenUnder26 = { genders: ['woman' as const], minAge: 18, maxAge: 25 };

  it('includes only matching gender and age', () => {
    expect(audienceIncludes(womenUnder26, { gender: 'woman', age: 22 })).toBe(true);
    expect(audienceIncludes(womenUnder26, { gender: 'woman', age: 26 })).toBe(false);
    expect(audienceIncludes(womenUnder26, { gender: 'man', age: 22 })).toBe(false);
    expect(audienceIncludes(womenUnder26, { gender: null, age: 22 })).toBe(false);
  });

  it('requires both people to be in each other’s audience', () => {
    const ravi: AudiencePerson = { gender: 'man', age: 24, audience: womenUnder26 };
    const meera: AudiencePerson = { gender: 'woman', age: 23, audience: { genders: ['man'], minAge: 21, maxAge: 30 } };
    const nisha: AudiencePerson = { gender: 'woman', age: 23, audience: { genders: ['woman'], minAge: 18, maxAge: 99 } };
    expect(mutuallyVisible(ravi, meera)).toBe(true);
    expect(mutuallyVisible(ravi, nisha)).toBe(false);
  });

  it('lists what is missing before a profile goes live', () => {
    const empty = missingRequirements({
      displayName: null,
      gender: null,
      heightCm: null,
      orientation: null,
      city: null,
      audience: { genders: [], minAge: null, maxAge: null },
      selfieVerified: false,
      hasPrimaryPhotoPost: false,
    });
    expect(empty).toEqual(['basics', 'audience', 'selfie', 'primary_photo_post']);
    const live = missingRequirements({
      displayName: 'Ravi',
      gender: 'man',
      heightCm: 178,
      orientation: 'straight',
      city: 'Bengaluru',
      audience: womenUnder26,
      selfieVerified: true,
      hasPrimaryPhotoPost: true,
    });
    expect(live).toEqual([]);
  });
});

describe('daily give-to-get', () => {
  it('uses the configured mandatory count (v1 fixed)', () => {
    expect(mandatoryCount('u', 3)).toBe(3);
  });

  it('unlocks once the required count is given', () => {
    expect(dailyStatus('2026-10-16', 3, 2).unlocked).toBe(false);
    expect(dailyStatus('2026-10-16', 3, 3).unlocked).toBe(true);
    expect(dailyStatus('2026-10-16', 0, 0).unlocked).toBe(true);
  });

  it('reveals items received on or before the latest unlocked day', () => {
    expect(isRevealed('2026-10-16', null)).toBe(false);
    expect(isRevealed('2026-10-16', '2026-10-15')).toBe(false);
    expect(isRevealed('2026-10-16', '2026-10-16')).toBe(true);
    expect(isRevealed('2026-10-14', '2026-10-16')).toBe(true);
  });

  it('shrinks the requirement when a slot cannot be refilled, never below what was given', () => {
    expect(requiredAfterUnfilledSlot(3, 1)).toBe(2);
    expect(requiredAfterUnfilledSlot(2, 2)).toBe(2);
  });

  it('computes day keys in the app timezone', () => {
    // 20:00 UTC on Oct 16 is already Oct 17 in India.
    expect(dayKeyFor(new Date('2026-10-16T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-17');
    expect(dayKeyFor(new Date('2026-10-16T20:00:00Z'), 'UTC')).toBe('2026-10-16');
  });
});

describe('daily set assignment', () => {
  const c = (id: string, recentReceived: number, score: number, created = '2026-10-01'): AssignmentCandidate => ({
    id,
    recentReceived,
    score,
    createdAt: new Date(created),
  });

  it('puts the least-served profile in the boost slot and fills the rest by relevance', () => {
    const set = pickDailySet([c('a', 5, 0.9), c('b', 0, 0.1), c('c', 2, 0.8), c('d', 1, 0.5)], 3);
    expect(set).toEqual([
      { id: 'b', slot: 'boost' },
      { id: 'a', slot: 'mandatory' },
      { id: 'c', slot: 'mandatory' },
    ]);
  });

  it('returns fewer slots when few profiles are eligible', () => {
    expect(pickDailySet([c('a', 1, 0.5)], 3)).toEqual([{ id: 'a', slot: 'boost' }]);
    expect(pickDailySet([], 3)).toEqual([]);
  });

  it('breaks boost ties by longest waiting', () => {
    const set = pickDailySet([c('new', 0, 0.9, '2026-10-10'), c('old', 0, 0.1, '2026-09-01')], 1);
    expect(set).toEqual([{ id: 'old', slot: 'boost' }]);
  });

  it('keeps the purpose of a replaced slot', () => {
    const pool = [c('a', 4, 0.9), c('b', 0, 0.2)];
    expect(pickReplacement(pool, 'boost')).toBe('b');
    expect(pickReplacement(pool, 'mandatory')).toBe('a');
    expect(pickReplacement([], 'mandatory')).toBeNull();
  });
});

describe('ranking (placeholder weights)', () => {
  it('prefers under-served, relevant, helpful profiles', () => {
    const strong = rankingScore({ reciprocityNeed: reciprocityNeed(0), freshness: 1, categoryAffinity: 1, qualityPrior: 1, penalties: 0 });
    const weak = rankingScore({ reciprocityNeed: reciprocityNeed(9), freshness: 0, categoryAffinity: 0, qualityPrior: 0, penalties: 0.3 });
    expect(strong).toBeGreaterThan(weak);
    expect(categoryAffinity(['style'], ['style', 'voice'])).toBe(0.5);
    expect(qualityPrior(0, 0)).toBe(0.5);
  });
});

describe('connect rules', () => {
  const now = new Date('2026-10-16T10:00:00Z');
  const base: ConnectState = {
    now,
    isSelf: false,
    receiverAvailable: true,
    viewerBlockedReceiver: false,
    receiverBlockedViewer: false,
    hasActiveConnection: false,
    hasPendingOutgoing: false,
    pendingIncomingId: null,
    gatePerspectiveId: 'p1',
    lastDeclinedAt: null,
    cooldownDays: 14,
    sentToday: 0,
    dailyCap: null,
  };

  it('allows a request once a perspective was given', () => {
    expect(evaluateConnect(base)).toEqual({ ok: true, perspectiveId: 'p1' });
  });

  it('requires a perspective first (the gate)', () => {
    const d = evaluateConnect({ ...base, gatePerspectiveId: null });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.code).toBe('PERSPECTIVE_REQUIRED_BEFORE_CONNECT');
  });

  it('enforces the decline cooldown', () => {
    const declined13DaysAgo = new Date(now.getTime() - 13 * 86400000);
    const declined15DaysAgo = new Date(now.getTime() - 15 * 86400000);
    const blocked = evaluateConnect({ ...base, lastDeclinedAt: declined13DaysAgo });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('CONNECT_COOLDOWN_ACTIVE');
    expect(evaluateConnect({ ...base, lastDeclinedAt: declined15DaysAgo }).ok).toBe(true);
    expect(cooldownUntil(declined13DaysAgo, 0, now)).toBeNull();
  });

  it('hides people who blocked you and refuses people you blocked', () => {
    const theyBlocked = evaluateConnect({ ...base, receiverBlockedViewer: true });
    const iBlocked = evaluateConnect({ ...base, viewerBlockedReceiver: true });
    expect(!theyBlocked.ok && theyBlocked.code).toBe('NOT_FOUND');
    expect(!iBlocked.ok && iBlocked.code).toBe('BLOCKED_PAIR');
  });

  it('refuses duplicates and existing connections', () => {
    expect(evaluateConnect({ ...base, hasActiveConnection: true }).ok).toBe(false);
    expect(evaluateConnect({ ...base, hasPendingOutgoing: true }).ok).toBe(false);
    const incoming = evaluateConnect({ ...base, pendingIncomingId: 'r9' });
    expect(!incoming.ok && incoming.details).toEqual({ incomingRequestId: 'r9' });
  });

  it('applies the daily cap only when configured', () => {
    expect(evaluateConnect({ ...base, sentToday: 50, dailyCap: null }).ok).toBe(true);
    const capped = evaluateConnect({ ...base, sentToday: 5, dailyCap: 5 });
    expect(!capped.ok && capped.code).toBe('CAP_REACHED');
  });
});

describe('accepting a connect request (both must give)', () => {
  it('needs the person accepting to have given the asker a perspective', () => {
    expect(evaluateAccept({ receiverGaveToSender: false })).toMatchObject({
      ok: false,
      code: 'PERSPECTIVE_REQUIRED_BEFORE_ACCEPT',
    });
    expect(evaluateAccept({ receiverGaveToSender: true })).toEqual({ ok: true });
  });
});
