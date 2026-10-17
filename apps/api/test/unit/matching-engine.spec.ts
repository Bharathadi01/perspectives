import {
  computeCompatibility,
  datingIntentionCompatibility,
  freshness,
  interestSimilarity,
  lifestyleCompatibility,
  qualityPrior,
  rankingScore,
  reciprocityNeed,
  reportPenalty,
} from '../../src/domain/ranking';
import type { Person } from '../../src/social/social.service';

function createMockPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    isActive: true,
    isLive: true,
    createdAt: new Date(),
    gender: 'woman',
    age: 25,
    city: 'Bengaluru',
    audience: { genders: ['man'], minAge: 20, maxAge: 35 },
    postCategories: ['vibe', 'style'],
    datingIntention: 'long_term',
    intentionDealbreaker: false,
    interests: ['cinema_film', 'specialty_coffee', 'books_reading'],
    lifestylePace: 'balanced',
    socialPreference: 'ambivert',
    heightCm: 165,
    ...overrides,
  };
}

describe('Matching Engine — Stage 2 Compatibility Scoring', () => {
  describe('Interest Similarity (Jaccard)', () => {
    it('returns score 1.0 for identical interest sets', () => {
      const interests = ['live_gigs', 'hiking_trails', 'home_cooking'];
      const res = interestSimilarity(interests, interests);
      expect(res.score).toBe(1.0);
      expect(res.sharedIds).toEqual(interests);
      expect(res.isKnown).toBe(true);
    });

    it('returns correct fractional score for partially overlapping sets', () => {
      const a = ['live_gigs', 'hiking_trails', 'indie_alt']; // size 3
      const b = ['live_gigs', 'home_cooking', 'indie_alt']; // size 3
      // shared: 2 ('live_gigs', 'indie_alt')
      // union: 4 ('live_gigs', 'hiking_trails', 'indie_alt', 'home_cooking')
      // J = 2/4 = 0.5
      const res = interestSimilarity(a, b);
      expect(res.score).toBe(0.5);
      expect(res.sharedIds).toEqual(['live_gigs', 'indie_alt']);
      expect(res.isKnown).toBe(true);
    });

    it('returns score 0.0 for completely disjoint interest sets', () => {
      const a = ['live_gigs', 'indie_alt'];
      const b = ['video_games', 'board_games'];
      const res = interestSimilarity(a, b);
      expect(res.score).toBe(0.0);
      expect(res.sharedIds).toEqual([]);
      expect(res.isKnown).toBe(true);
    });

    it('handles empty sets as unknown (0.5 neutral, isKnown = false)', () => {
      const emptyRes = interestSimilarity([], []);
      expect(emptyRes.score).toBe(0.5);
      expect(emptyRes.isKnown).toBe(false);
      expect(emptyRes.sharedIds).toEqual([]);

      const partialEmpty = interestSimilarity(['live_gigs'], []);
      expect(partialEmpty.score).toBe(0.5);
      expect(partialEmpty.isKnown).toBe(false);
    });
  });

  describe('Dating Intention Compatibility Matrix', () => {
    it('awards 1.0 for identical intentions', () => {
      const res = datingIntentionCompatibility('long_term', 'long_term');
      expect(res.score).toBe(1.0);
      expect(res.isKnown).toBe(true);
      expect(res.compatible).toBe(true);
    });

    it('awards 0.85 for adjacent compatible intentions (e.g. long_term and long_term_open)', () => {
      const res1 = datingIntentionCompatibility('long_term', 'long_term_open');
      expect(res1.score).toBe(0.85);
      expect(res1.compatible).toBe(true);

      const res2 = datingIntentionCompatibility('long_term_open', 'long_term');
      expect(res2.score).toBe(0.85);
      expect(res2.compatible).toBe(true);
    });

    it('awards 0.85 for casual and short_term_open', () => {
      const res = datingIntentionCompatibility('casual', 'short_term_open');
      expect(res.score).toBe(0.85);
      expect(res.compatible).toBe(true);
    });

    it('awards 0.6 for figuring_out exploratory intention', () => {
      const res = datingIntentionCompatibility('long_term', 'figuring_out');
      expect(res.score).toBe(0.6);
      expect(res.compatible).toBe(true);
    });

    it('evaluates opposing intentions with low compatibility (0.15) and compatible = false', () => {
      const res = datingIntentionCompatibility('long_term', 'casual');
      expect(res.score).toBe(0.15);
      expect(res.isKnown).toBe(true);
      expect(res.compatible).toBe(false);
    });

    it('handles missing intention as neutral fallback (0.5, isKnown = false)', () => {
      const res1 = datingIntentionCompatibility(null, 'long_term');
      expect(res1.score).toBe(0.5);
      expect(res1.isKnown).toBe(false);

      const res2 = datingIntentionCompatibility(null, null);
      expect(res2.score).toBe(0.5);
      expect(res2.isKnown).toBe(false);
    });
  });

  describe('Lifestyle and Social Preference Compatibility', () => {
    it('awards 1.0 for matching pace and social preferences', () => {
      const res = lifestyleCompatibility('balanced', 'balanced', 'ambivert', 'ambivert');
      expect(res.score).toBe(1.0);
      expect(res.isKnown).toBe(true);
    });

    it('moderates score for contrasting diurnal rhythms (early_bird vs night_owl)', () => {
      const res = lifestyleCompatibility('early_bird', 'night_owl', 'introvert', 'introvert');
      // pace: 0.3, social: 1.0 -> avg 0.65
      expect(res.score).toBeCloseTo(0.65, 2);
      expect(res.isKnown).toBe(true);
    });

    it('handles missing lifestyle data gracefully without zeroing the score', () => {
      const res = lifestyleCompatibility(null, null, null, null);
      expect(res.score).toBe(0.5);
      expect(res.isKnown).toBe(false);
    });
  });

  describe('Full Multidimensional Compatibility & Missing Data Renormalization', () => {
    it('computes high compatibility and grounded reasons when profiles strongly align', () => {
      const viewer = createMockPerson({
        interests: ['cinema_film', 'specialty_coffee', 'books_reading'],
        datingIntention: 'long_term',
        lifestylePace: 'balanced',
        socialPreference: 'ambivert',
      });
      const candidate = createMockPerson({
        interests: ['cinema_film', 'specialty_coffee', 'travel_backpacking'],
        datingIntention: 'long_term',
        lifestylePace: 'balanced',
        socialPreference: 'ambivert',
      });

      const result = computeCompatibility(viewer, candidate);

      expect(result.score).toBeGreaterThanOrEqual(0.8);
      expect(result.coverage).toBe(1.0);
      expect(result.reasons.length).toBeGreaterThan(0);
      // Explanations must be grounded in actual matching attributes
      expect(result.reasons.some((r) => r.kind === 'shared_interest' && r.text.includes('Cinema & Arthouse'))).toBe(true);
      expect(result.reasons.some((r) => r.kind === 'dating_intention' && r.text.includes('Long-term partner'))).toBe(true);
    });

    it('renormalizes weights dynamically when candidate has missing interests and intention', () => {
      const viewer = createMockPerson({
        interests: ['cinema_film'],
        datingIntention: 'long_term',
      });
      const sparseCandidate = createMockPerson({
        interests: [],
        datingIntention: null,
        lifestylePace: null,
        socialPreference: null,
        postCategories: [],
      });

      const result = computeCompatibility(viewer, sparseCandidate);

      // Score must not be 0 because missing data is not an automatic rejection
      expect(result.score).toBe(0.5);
      expect(result.coverage).toBe(0.0);
      expect(result.reasons).toEqual([]);
    });

    it('is strictly deterministic for identical inputs', () => {
      const viewer = createMockPerson({ interests: ['coffee_cafes', 'live_music'] });
      const candidate = createMockPerson({ interests: ['coffee_cafes', 'hiking_camping'] });

      const run1 = computeCompatibility(viewer, candidate);
      const run2 = computeCompatibility(viewer, candidate);

      expect(run1.score).toBe(run2.score);
      expect(run1.coverage).toBe(run2.coverage);
      expect(run1.reasons).toEqual(run2.reasons);
    });
  });

  describe('Ranking Score Integration', () => {
    it('combines compatibility with reciprocity, freshness, and quality priors', () => {
      const highCompatScore = rankingScore({
        compatibility: 0.9,
        reciprocityNeed: reciprocityNeed(1),
        freshness: freshness(2),
        qualityPrior: qualityPrior(10, 1),
        penalties: reportPenalty(0),
      });

      const lowCompatScore = rankingScore({
        compatibility: 0.2,
        reciprocityNeed: reciprocityNeed(1),
        freshness: freshness(2),
        qualityPrior: qualityPrior(10, 1),
        penalties: reportPenalty(0),
      });

      expect(highCompatScore).toBeGreaterThan(lowCompatScore);
    });

    it('penalizes reported candidates proportionally', () => {
      const clean = rankingScore({
        compatibility: 0.8,
        reciprocityNeed: 0.5,
        freshness: 0.8,
        qualityPrior: 0.8,
        penalties: reportPenalty(0),
      });

      const reported = rankingScore({
        compatibility: 0.8,
        reciprocityNeed: 0.5,
        freshness: 0.8,
        qualityPrior: 0.8,
        penalties: reportPenalty(3), // 0.3 penalty
      });

      expect(clean - reported).toBeCloseTo(0.3, 2);
    });
  });

  describe('Stage 1 Eligibility & Hard Dealbreakers', () => {
    function isStage1Eligible(viewer: Person, candidate: Person): boolean {
      if (viewer.intentionDealbreaker) {
        const comp = datingIntentionCompatibility(viewer.datingIntention, candidate.datingIntention);
        if (!comp.compatible) return false;
      }
      if (candidate.intentionDealbreaker) {
        const comp = datingIntentionCompatibility(candidate.datingIntention, viewer.datingIntention);
        if (!comp.compatible) return false;
      }
      return true;
    }

    it('rejects candidates with opposing intentions when viewer marked intention as a dealbreaker', () => {
      const viewer = createMockPerson({
        datingIntention: 'long_term',
        intentionDealbreaker: true, // Dealbreaker active!
      });
      const candidate = createMockPerson({
        datingIntention: 'casual',
        intentionDealbreaker: false,
      });

      expect(isStage1Eligible(viewer, candidate)).toBe(false);
    });

    it('rejects candidate when candidate marked intention as dealbreaker against viewer', () => {
      const viewer = createMockPerson({
        datingIntention: 'casual',
        intentionDealbreaker: false,
      });
      const candidate = createMockPerson({
        datingIntention: 'long_term',
        intentionDealbreaker: true, // Candidate dealbreaker active!
      });

      expect(isStage1Eligible(viewer, candidate)).toBe(false);
    });

    it('permits candidates with opposing intentions when NEITHER marked dealbreaker, allowing soft scoring', () => {
      const viewer = createMockPerson({
        datingIntention: 'long_term',
        intentionDealbreaker: false,
      });
      const candidate = createMockPerson({
        datingIntention: 'casual',
        intentionDealbreaker: false,
      });

      // Allowed through Stage 1
      expect(isStage1Eligible(viewer, candidate)).toBe(true);

      // But Stage 2 compatibility reflects the difference
      const stage2 = computeCompatibility(viewer, candidate);
      const intentionComp = datingIntentionCompatibility(viewer.datingIntention, candidate.datingIntention);
      expect(intentionComp.score).toBe(0.15);
      expect(stage2.score).toBeLessThan(0.85);
    });
  });
});
