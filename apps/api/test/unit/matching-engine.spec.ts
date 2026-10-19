import {
  DEFAULT_RANKING_WEIGHTS,
  computeCompatibility,
  givingQuality,
  interestSimilarity,
  newMemberScore,
  rankingScore,
  reciprocityNeed,
  recentlyActiveScore,
  reportPenalty,
} from '../../src/domain/ranking';

/** Ranking for the beta (docs/PRODUCT.md → Algorithms, decided 2026-10-20). */
describe('ranking (beta formula)', () => {
  describe('shared interests (Jaccard)', () => {
    it('is 1 for identical sets and 0 for disjoint sets', () => {
      expect(interestSimilarity(['hiking_trails', 'photography'], ['photography', 'hiking_trails']).score).toBe(1);
      expect(interestSimilarity(['hiking_trails'], ['photography']).score).toBe(0);
    });

    it('is the shared share of everything either chose', () => {
      const r = interestSimilarity(['a', 'b', 'c'], ['b', 'c', 'd']);
      expect(r.score).toBeCloseTo(2 / 4);
      expect(r.sharedIds).toEqual(['b', 'c']);
    });

    it('is a neutral 0.5 when either side has no interests', () => {
      expect(interestSimilarity([], ['a'])).toEqual({ score: 0.5, sharedIds: [], isKnown: false });
    });
  });

  describe('fit uses shared interests only', () => {
    it('gives a plain-words reason for shared interests and nothing else', () => {
      const r = computeCompatibility({ interests: ['photography', 'running'] }, { interests: ['photography'] });
      expect(r.score).toBeCloseTo(0.5);
      expect(r.reasons).toHaveLength(1);
      expect(r.reasons[0].kind).toBe('shared_interest');
    });

    it('ignores relationship goals, daily rhythm and social energy', () => {
      const viewer = { interests: ['photography'], datingIntention: 'long_term', lifestylePace: 'early_bird', socialPreference: 'introvert' };
      const a = { interests: ['photography'], datingIntention: 'casual', lifestylePace: 'night_owl', socialPreference: 'social_butterfly' };
      const b = { interests: ['photography'], datingIntention: 'long_term', lifestylePace: 'early_bird', socialPreference: 'introvert' };
      expect(computeCompatibility(viewer, a)).toEqual(computeCompatibility(viewer, b));
    });
  });

  describe('inputs', () => {
    it('need falls as a profile receives perspectives or sits in sets today', () => {
      expect(reciprocityNeed(0)).toBe(1);
      expect(reciprocityNeed(1)).toBe(0.5);
      expect(reciprocityNeed(3)).toBe(0.25);
    });

    it('recently active: today or yesterday 1, 2 to 3 days 0.5, 4 to 7 days 0.2, older 0', () => {
      expect(recentlyActiveScore(0)).toBe(1);
      expect(recentlyActiveScore(1)).toBe(1);
      expect(recentlyActiveScore(2)).toBe(0.5);
      expect(recentlyActiveScore(3)).toBe(0.5);
      expect(recentlyActiveScore(4)).toBe(0.2);
      expect(recentlyActiveScore(7)).toBe(0.2);
      expect(recentlyActiveScore(8)).toBe(0);
      expect(recentlyActiveScore(null)).toBe(0);
    });

    it('new member: 1 during the first week, then 0', () => {
      expect(newMemberScore(0)).toBe(1);
      expect(newMemberScore(6.9)).toBe(1);
      expect(newMemberScore(7)).toBe(0);
    });

    it('giving quality starts neutral and moves with enough marks', () => {
      expect(givingQuality(0, 0)).toBe(0.5);
      expect(givingQuality(1, 0)).toBeCloseTo(3.5 / 6);
      expect(givingQuality(0, 1)).toBeCloseTo(2.5 / 6);
      expect(givingQuality(20, 0)).toBeGreaterThan(0.85);
      expect(givingQuality(0, 20)).toBeLessThan(0.15);
    });

    it('report penalty is 0.1 per different reporter, at most 0.5', () => {
      expect(reportPenalty(0)).toBe(0);
      expect(reportPenalty(2)).toBeCloseTo(0.2);
      expect(reportPenalty(9)).toBeCloseTo(0.5);
    });
  });

  describe('score', () => {
    const neutral = { sharedInterests: 0.5, need: 0.5, recentlyActive: 0.5, newMember: 0, givingQuality: 0.5, penalties: 0 };

    it('uses the decided weights (0.45, 0.20, 0.15, 0.10, 0.10)', () => {
      expect(DEFAULT_RANKING_WEIGHTS).toEqual({ sharedInterests: 0.45, need: 0.2, recentlyActive: 0.15, newMember: 0.1, givingQuality: 0.1 });
      const all = rankingScore({ sharedInterests: 1, need: 1, recentlyActive: 1, newMember: 1, givingQuality: 1, penalties: 0 });
      expect(all).toBeCloseTo(1);
    });

    it('prefers shared interests most, then need', () => {
      const interests = rankingScore({ ...neutral, sharedInterests: 1 });
      const need = rankingScore({ ...neutral, need: 1 });
      const active = rankingScore({ ...neutral, recentlyActive: 1 });
      expect(interests).toBeGreaterThan(need);
      expect(need).toBeGreaterThan(active);
    });

    it('subtracts the report penalty', () => {
      expect(rankingScore({ ...neutral, penalties: 0.2 })).toBeCloseTo(rankingScore(neutral) - 0.2);
    });

    it('accepts tuned weights from config', () => {
      const onlyNeed = { sharedInterests: 0, need: 1, recentlyActive: 0, newMember: 0, givingQuality: 0 };
      expect(rankingScore({ ...neutral, need: 0.25 }, onlyNeed)).toBeCloseTo(0.25);
    });
  });
});
