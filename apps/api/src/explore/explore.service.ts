import { Injectable } from '@nestjs/common';
import { InMemoryPerspectiveClient } from '@perspective/api-client';
import { ExploreBatch, SkipRequestInput } from '@perspective/contracts';

@Injectable()
export class ExploreService {
  private client = new InMemoryPerspectiveClient();

  async getBatch(userId: string): Promise<ExploreBatch> {
    return this.client.getExploreBatch();
  }

  async skip(userId: string, input: SkipRequestInput): Promise<{ success: boolean }> {
    return this.client.skipRequest(input);
  }

  // Implementation of authoritative formula from Blueprint page 8:
  // score = 0.30 lensFit + 0.20 categoryAffinity + 0.15 languageFit + 0.15 freshness + 0.10 reciprocityNeed + 0.10 qualityPrior - penalties
  calculateRankingScore(factors: {
    lensFit: number;
    categoryAffinity: number;
    languageFit: number;
    freshness: number;
    reciprocityNeed: number;
    qualityPrior: number;
    penalties: number;
  }): number {
    return (
      0.30 * factors.lensFit +
      0.20 * factors.categoryAffinity +
      0.15 * factors.languageFit +
      0.15 * factors.freshness +
      0.10 * factors.reciprocityNeed +
      0.10 * factors.qualityPrior -
      factors.penalties
    );
  }
}
