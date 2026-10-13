import { ExploreService } from '../src/explore/explore.service';

describe('ExploreService Ranking Algorithm', () => {
  let service: ExploreService;

  beforeEach(() => {
    service = new ExploreService();
  });

  it('calculates ranking score accurately per blueprint formula', () => {
    const factors = {
      lensFit: 1.0,           // 0.30 * 1.0 = 0.30
      categoryAffinity: 0.8,  // 0.20 * 0.8 = 0.16
      languageFit: 1.0,       // 0.15 * 1.0 = 0.15
      freshness: 0.5,         // 0.15 * 0.5 = 0.075
      reciprocityNeed: 0.5,   // 0.10 * 0.5 = 0.05
      qualityPrior: 0.9,      // 0.10 * 0.9 = 0.09
      penalties: 0.0,
    };

    const score = service.calculateRankingScore(factors);
    // Total: 0.30 + 0.16 + 0.15 + 0.075 + 0.05 + 0.09 = 0.825
    expect(score).toBeCloseTo(0.825, 3);
  });

  it('applies penalties for overexposure or reports', () => {
    const factorsWithPenalties = {
      lensFit: 1.0,
      categoryAffinity: 1.0,
      languageFit: 1.0,
      freshness: 1.0,
      reciprocityNeed: 1.0,
      qualityPrior: 1.0,
      penalties: 0.4,
    };

    const score = service.calculateRankingScore(factorsWithPenalties);
    // 1.0 - 0.4 = 0.6
    expect(score).toBeCloseTo(0.6, 3);
  });
});
