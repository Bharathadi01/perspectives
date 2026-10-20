import { dayKeyFor, daysBetweenKeys } from '../../src/common/day';
import {
  mandatoryPoolSize,
  mayHoldMandatorySlot,
  freshFirstPool,
  pickAfterSetProfile,
  pickDailySet,
  pickReplacement,
  qualifiesForBoost,
  served,
  AssignmentCandidate,
  AssignmentPolicy,
} from '../../src/domain/assignment';
import { seededUnit, weightedPick } from '../../src/domain/random';
import { cooldownUntil, evaluateAccept, evaluateConnect, ConnectState } from '../../src/domain/connect';
import { bonusCount, dailyStatus, isRevealed, mandatoryCount, requiredAfterUnfilledSlot } from '../../src/domain/daily';
import { audienceIncludes, missingRequirements, mutuallyVisible, AudiencePerson } from '../../src/domain/eligibility';
import { needsWidening, nextWidening, WideningPolicy } from '../../src/domain/widening';

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
      city: null,
      goals: [],
      audience: { genders: [], minAge: null, maxAge: null },
      selfieVerified: false,
      hasPrimaryPhotoPost: false,
    });
    expect(empty).toEqual(['basics', 'goal', 'audience', 'selfie', 'primary_photo_post']);
    const live = missingRequirements({
      displayName: 'Ravi',
      gender: 'man',
      heightCm: 178,
      city: 'Bengaluru',
      goals: ['meet_people'],
      audience: womenUnder26,
      selfieVerified: true,
      hasPrimaryPhotoPost: true,
    });
    // Orientation is optional and private (decided 2026-10-20): a profile goes live without it.
    expect(live).toEqual([]);
  });
});

describe('automatic age widening', () => {
  const policy: WideningPolicy = { stepYears: 2, maxYears: 4, floor: 18, ceiling: 99 };

  it('widens 2 years at each end at a time, at most 4 beyond the chosen range', () => {
    const chosen = { minAge: 22, maxAge: 26 };
    const first = nextWidening(chosen, chosen, policy);
    expect(first).toEqual({ minAge: 20, maxAge: 28 });
    const second = nextWidening(chosen, first!, policy);
    expect(second).toEqual({ minAge: 18, maxAge: 30 });
    expect(nextWidening(chosen, second!, policy)).toBeNull();
  });

  it('never goes below 18 and keeps widening the other end', () => {
    const chosen = { minAge: 19, maxAge: 24 };
    expect(nextWidening(chosen, chosen, policy)).toEqual({ minAge: 18, maxAge: 26 });
    expect(nextWidening(chosen, { minAge: 18, maxAge: 26 }, policy)).toEqual({ minAge: 18, maxAge: 28 });
    expect(nextWidening(chosen, { minAge: 18, maxAge: 28 }, policy)).toBeNull();
  });

  it('stops at the oldest allowed age and when turned off', () => {
    expect(nextWidening({ minAge: 18, maxAge: 99 }, { minAge: 18, maxAge: 99 }, policy)).toBeNull();
    expect(nextWidening({ minAge: 22, maxAge: 26 }, { minAge: 22, maxAge: 26 }, { ...policy, maxYears: 0 })).toBeNull();
  });

  it('measures from the chosen range, so a range already widened only grows to the limit', () => {
    expect(nextWidening({ minAge: 22, maxAge: 26 }, { minAge: 20, maxAge: 28 }, policy)).toEqual({ minAge: 18, maxAge: 30 });
  });

  it('widens only when fewer people than a set of 2 needs are available', () => {
    expect(needsWidening(0, 6)).toBe(true);
    expect(needsWidening(5, 6)).toBe(true);
    expect(needsWidening(6, 6)).toBe(false);
  });
});

describe('daily give-to-get', () => {
  it('asks for 3, 2 or 1 by how many people could fill a slot (15+, 6 to 14, 1 to 5), 0 when nobody can', () => {
    expect(mandatoryCount(40)).toBe(3);
    expect(mandatoryCount(15)).toBe(3);
    expect(mandatoryCount(14)).toBe(2);
    expect(mandatoryCount(6)).toBe(2);
    expect(mandatoryCount(5)).toBe(1);
    expect(mandatoryCount(1)).toBe(1);
    expect(mandatoryCount(0)).toBe(0);
  });

  it('never asks for more than the configured maximum', () => {
    expect(mandatoryCount(40, 2)).toBe(2);
    expect(mandatoryCount(40, 0)).toBe(0);
    expect(mandatoryCount(10, 3, { full: 10, partial: 4 })).toBe(3);
  });

  it('gives 5 more profiles after the set at 15+, 4 at 6 to 14, then as many as are left up to 3', () => {
    expect(bonusCount(30)).toBe(5);
    expect(bonusCount(15)).toBe(5);
    expect(bonusCount(14)).toBe(4);
    expect(bonusCount(6)).toBe(4);
    expect(bonusCount(5)).toBe(3);
    expect(bonusCount(2)).toBe(2);
    expect(bonusCount(0)).toBe(0);
  });

  it('counts whole days between day keys', () => {
    expect(daysBetweenKeys('2026-10-20', '2026-10-20')).toBe(0);
    expect(daysBetweenKeys('2026-10-17', '2026-10-20')).toBe(3);
    expect(daysBetweenKeys('2026-09-30', '2026-10-01')).toBe(1);
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
    expect(pickDailySet([c('a', 0, 0.5)], 3)).toEqual([{ id: 'a', slot: 'boost' }]);
    expect(pickDailySet([], 3)).toEqual([]);
  });

  it('only boosts someone with no perspectives in the window; otherwise every slot is a best match', () => {
    expect(pickDailySet([c('a', 1, 0.5)], 3)).toEqual([{ id: 'a', slot: 'mandatory' }]);
    expect(pickDailySet([c('a', 2, 0.9), c('b', 1, 0.1)], 2)).toEqual([
      { id: 'a', slot: 'mandatory' },
      { id: 'b', slot: 'mandatory' },
    ]);
  });

  it('breaks boost ties by longest waiting', () => {
    const set = pickDailySet([c('new', 0, 0.9, '2026-10-10'), c('old', 0, 0.1, '2026-09-01')], 1);
    expect(set).toEqual([{ id: 'old', slot: 'boost' }]);
  });

  it('keeps the purpose of a replaced slot', () => {
    const pool = [c('a', 4, 0.9), c('b', 0, 0.2)];
    expect(pickReplacement(pool, 'boost')).toEqual({ id: 'b', slot: 'boost' });
    expect(pickReplacement(pool, 'mandatory')).toEqual({ id: 'a', slot: 'mandatory' });
    expect(pickReplacement([], 'mandatory')).toBeNull();
  });
});

describe('daily set assignment with the over-exposure policy', () => {
  const policy: AssignmentPolicy = { seed: 'viewer:2026-10-19', assignCap: 6, boostPoolSize: 5, pauseReporters: 2 };
  const c = (id: string, o: Partial<AssignmentCandidate> = {}): AssignmentCandidate => ({
    id,
    recentReceived: 0,
    score: 0.5,
    createdAt: new Date('2026-10-01'),
    ...o,
  });

  /** Builds sets for many viewers one after another, counting assignments as they land. */
  function buildForViewers(pool: AssignmentCandidate[], viewers: number): Map<string, number> {
    const assigned = new Map<string, number>();
    for (let v = 0; v < viewers; v++) {
      const view = pool.map((p) => ({ ...p, assignedToday: assigned.get(p.id) ?? 0 }));
      for (const pick of pickDailySet(view, 3, { ...policy, seed: `viewer-${v}:2026-10-19` })) {
        assigned.set(pick.id, (assigned.get(pick.id) ?? 0) + 1);
      }
    }
    return assigned;
  }

  it('counts slots already assigned today as served, and boosts the least-assigned', () => {
    expect(served(c('a', { recentReceived: 2, assignedToday: 3 }))).toBe(5);
    const set = pickDailySet([c('busy', { assignedToday: 4 }), c('fresh', { assignedToday: 0 })], 1, policy);
    expect(set).toEqual([{ id: 'fresh', slot: 'boost' }]);
  });

  it('spreads the boost across viewers instead of piling onto one profile', () => {
    const pool = Array.from({ length: 30 }, (_, i) => c(`p${i}`, { recentReceived: i % 4, score: i / 30 }));
    const assigned = buildForViewers(pool, 50);
    expect(Math.max(...assigned.values())).toBeLessThanOrEqual(6);
    expect(assigned.size).toBeGreaterThan(20);
  });

  it('goes over the cap only when nobody else is left', () => {
    const set = pickDailySet([c('full', { assignedToday: 6 }), c('open', { assignedToday: 2 })], 2, policy);
    expect(set.map((s) => s.id)).toEqual(['open', 'full']);
    expect(set[1].slot).toBe('mandatory');
  });

  it('picks the same boost for the same viewer and day', () => {
    const pool = Array.from({ length: 8 }, (_, i) => c(`p${i}`, { compatibilityScore: i / 8 }));
    expect(pickDailySet(pool, 3, policy)).toEqual(pickDailySet(pool, 3, policy));
  });

  it('chooses the boost only among people with no recent perspectives, least-assigned first', () => {
    const pool = [
      c('zero'),
      c('zeroBusy', { assignedToday: 3 }),
      c('one', { recentReceived: 1 }),
      c('five', { recentReceived: 5 }),
    ];
    for (let v = 0; v < 40; v++) {
      const [boost] = pickDailySet(pool, 1, { ...policy, seed: `v${v}` });
      expect(boost).toEqual({ id: 'zero', slot: 'boost' });
    }
    expect(qualifiesForBoost(c('one', { recentReceived: 1 }), policy)).toBe(false);
  });

  it('never boosts or assigns a profile reported by two different people', () => {
    const reported = c('reported', { recentReporters: 2, score: 0.99 });
    const set = pickDailySet([reported, c('a', { recentReceived: 3 }), c('b', { recentReceived: 4 })], 3, policy);
    expect(set.map((s) => s.id)).not.toContain('reported');
    expect(pickReplacement([reported], 'boost', policy)).toBeNull();
    expect(pickDailySet([c('once', { recentReporters: 1 })], 1, policy)).toEqual([{ id: 'once', slot: 'boost' }]);
  });

  it('never boosts an owner who has not opened the app in the last few days, but may still rank them', () => {
    const set = pickDailySet([c('away', { boostReady: false }), c('here', { recentReceived: 3, score: 0.1 })], 2, policy);
    expect(set).toEqual([
      { id: 'away', slot: 'mandatory' },
      { id: 'here', slot: 'mandatory' },
    ]);
    expect(pickDailySet([c('away', { boostReady: false }), c('here', { score: 0.1 })], 2, policy)).toEqual([
      { id: 'here', slot: 'boost' },
      { id: 'away', slot: 'mandatory' },
    ]);
  });

  it('keeps people inactive for 7 days and people at the soft received limit out of every set slot', () => {
    const dormant = c('dormant', { dormant: true, score: 0.99 });
    const limited = c('limited', { atSoftLimit: true, score: 0.98 });
    const ok = c('ok', { recentReceived: 2, score: 0.1 });
    const set = pickDailySet([dormant, limited, ok], 3, policy);
    expect(set).toEqual([{ id: 'ok', slot: 'mandatory' }]);
    expect(pickReplacement([dormant, limited], 'boost', policy)).toBeNull();
    expect(pickReplacement([dormant, limited], 'mandatory', policy)).toBeNull();
    expect(mayHoldMandatorySlot(dormant, policy)).toBe(false);
    expect(mayHoldMandatorySlot(limited, policy)).toBe(false);
    expect(mandatoryPoolSize([dormant, limited, ok, c('paused', { recentReporters: 2 })], policy)).toBe(1);
  });

  it('turns the boost into a relevance slot when nobody qualifies', () => {
    const set = pickDailySet([c('away', { boostReady: false, score: 0.9 }), c('also', { boostReady: false })], 2, policy);
    expect(set.every((s) => s.slot === 'mandatory')).toBe(true);
    expect(pickReplacement([c('away', { boostReady: false })], 'boost', policy)).toEqual({ id: 'away', slot: 'mandatory' });
  });
});

describe('seeded randomness', () => {
  it('is deterministic and stays in [0, 1)', () => {
    expect(seededUnit('a')).toBe(seededUnit('a'));
    expect(seededUnit('a')).not.toBe(seededUnit('b'));
    for (let i = 0; i < 100; i++) {
      const u = seededUnit(`s${i}`);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('picks in proportion to weight', () => {
    let heavy = 0;
    for (let i = 0; i < 2000; i++) if (weightedPick(['light', 'heavy'], (x) => (x === 'heavy' ? 3 : 1), `w${i}`) === 'heavy') heavy++;
    expect(heavy / 2000).toBeGreaterThan(0.68);
    expect(heavy / 2000).toBeLessThan(0.82);
    expect(weightedPick([], () => 1, 'x')).toBeNull();
  });
});

describe('profiles after the set', () => {
  const c = (id: string, score: number): AssignmentCandidate => ({ id, recentReceived: 0, score, createdAt: new Date('2026-10-01') });
  const pool = [c('low', 0.1), c('best', 0.9), c('mid', 0.5), c('also', 0.3)];

  it('shows best matches first', () => {
    expect(pickAfterSetProfile(pool, 5, 'v:2026-10-20')?.id).toBe('best');
    expect(pickAfterSetProfile(pool, 2, 'v:2026-10-20')?.id).toBe('best');
  });

  it('makes the last one a random discovery pick, the same on every reopen that day', () => {
    const first = pickAfterSetProfile(pool, 1, 'v:2026-10-20');
    expect(first).not.toBeNull();
    expect(pickAfterSetProfile(pool, 1, 'v:2026-10-20')).toEqual(first);
    const picks = new Set(Array.from({ length: 40 }, (_, i) => pickAfterSetProfile(pool, 1, `v${i}:2026-10-20`)?.id));
    expect(picks.size).toBeGreaterThan(1);
  });

  it('shows nothing when the allowance is used up or nobody is left', () => {
    expect(pickAfterSetProfile(pool, 0, 'v')).toBeNull();
    expect(pickAfterSetProfile([], 3, 'v')).toBeNull();
  });
});

describe('fresh people first', () => {
  const c = (id: string, fresh: boolean): AssignmentCandidate => ({ id, recentReceived: 0, score: 0.5, createdAt: new Date('2026-10-01'), fresh });
  const freshOnes = (n: number) => Array.from({ length: n }, (_, i) => c(`f${i}`, true));
  const returning = (n: number) => Array.from({ length: n }, (_, i) => c(`r${i}`, false));
  const ids = (list: AssignmentCandidate[]) => list.map((x) => x.id);

  it('uses only fresh people while at least 6 are left', () => {
    expect(freshFirstPool([...freshOnes(12), ...returning(8)], 6)).toHaveLength(12);
    expect(ids(freshFirstPool([...freshOnes(6), ...returning(3)], 6))).toEqual(ids(freshOnes(6)));
  });

  it('adds returning people when fewer than 6 fresh people are left (4 fresh + 10 returning = 14)', () => {
    expect(freshFirstPool([...freshOnes(4), ...returning(10)], 6)).toHaveLength(14);
    expect(freshFirstPool([...freshOnes(5), ...returning(1)], 6)).toHaveLength(6);
    expect(freshFirstPool(returning(3), 6)).toHaveLength(3);
  });

  it('counts fresh people already used up today, so the choice stays steady through the day', () => {
    expect(freshFirstPool([...freshOnes(4), ...returning(10)], 6, 2)).toHaveLength(4);
    expect(freshFirstPool([...freshOnes(4), ...returning(10)], 6, 1)).toHaveLength(14);
  });

  it('counts only the fresh people the caller says can fill a slot', () => {
    const pool = [...freshOnes(8), ...returning(2)];
    const onlyFirstFour = (x: AssignmentCandidate) => ['f0', 'f1', 'f2', 'f3'].includes(x.id);
    expect(freshFirstPool(pool, 6, 0, onlyFirstFour)).toHaveLength(10);
  });

  it('treats a candidate without the flag as fresh', () => {
    const plain: AssignmentCandidate = { id: 'x', recentReceived: 0, score: 0.5, createdAt: new Date('2026-10-01') };
    expect(freshFirstPool([plain, ...returning(2)], 1)).toEqual([plain]);
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
