// Market Scanner - Finds betting opportunities
import type { Market, BettingOpportunity, AgentConfig } from '@/types/polymarket';
import { getAPI } from './polymarket-api';

export class MarketScanner {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // Scan markets for opportunities based on strategy
  async scanForOpportunities(): Promise<BettingOpportunity[]> {
    const api = getAPI();
    if (!api) {
      console.error('API not initialized');
      return [];
    }

    const markets = await api.getMarkets(100);
    const opportunities: BettingOpportunity[] = [];

    for (const market of markets) {
      // Skip markets with low liquidity
      if (market.liquidity < this.config.safetyLimits.minLiquidity) {
        continue;
      }

      // Skip closed or inactive markets
      if (!market.active || market.closed) {
        continue;
      }

      // Analyze each outcome
      for (const outcome of market.outcomes) {
        const opportunity = this.analyzeOutcome(market, outcome);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }

    // Sort by expected value (highest first)
    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  // Analyze a single outcome for opportunities
  private analyzeOutcome(market: Market, outcome: any): BettingOpportunity | null {
    const price = outcome.price;

    // Strategy 1: Undervalued (bet YES when price is low)
    if (price < this.config.undervaluedThreshold) {
      // Estimate "true" probability with a simple contrarian model
      // If market says 20%, we bet it's closer to 35%
      const estimatedProb = this.estimateTrueProbability(price, 'UNDERVALUED');
      const confidence = estimatedProb;

      // Calculate expected value
      const potentialReturn = (1 / price) - 1;
      const expectedValue = (estimatedProb * potentialReturn) - ((1 - estimatedProb) * 1);

      if (expectedValue > 0.05) { // Min 5% edge
        return {
          market,
          outcome,
          strategy: 'UNDERVALUED',
          recommendedBet: 'YES',
          confidence,
          suggestedAmount: 0, // Will be calculated by RiskManager
          expectedValue,
        };
      }
    }

    // Strategy 2: Overvalued (bet NO when price is high)
    if (price > this.config.overvaluedThreshold) {
      // If market says 85%, we bet it's closer to 70%
      const estimatedProb = this.estimateTrueProbability(price, 'OVERVALUED');
      const noPrice = 1 - price;
      const potentialReturn = (1 / noPrice) - 1;
      const winProb = 1 - estimatedProb; // Probability YES is wrong
      const expectedValue = (winProb * potentialReturn) - ((1 - winProb) * 1);

      if (expectedValue > 0.05) { // Min 5% edge
        return {
          market,
          outcome,
          strategy: 'OVERVALUED',
          recommendedBet: 'NO',
          confidence: 1 - estimatedProb,
          suggestedAmount: 0,
          expectedValue,
        };
      }
    }

    return null;
  }

  // Simple probability estimation model
  // In a real agent, this could use ML, sentiment analysis, etc.
  private estimateTrueProbability(marketPrice: number, strategy: 'UNDERVALUED' | 'OVERVALUED'): number {
    // Mean reversion assumption: extreme prices tend to revert
    // This is a simplified model - real implementation would be more sophisticated

    if (strategy === 'UNDERVALUED') {
      // Market says low, we think it's higher
      // Regression toward 50% with dampening
      const reversion = 0.3; // 30% mean reversion
      return marketPrice + (0.5 - marketPrice) * reversion;
    } else {
      // Market says high, we think it's lower
      const reversion = 0.25; // 25% mean reversion for overvalued
      return marketPrice - (marketPrice - 0.5) * reversion;
    }
  }

  // Get hot markets (high volume, closing soon)
  async getHotMarkets(limit = 10): Promise<Market[]> {
    const api = getAPI();
    if (!api) return [];

    const markets = await api.getMarkets(100);

    // Filter and sort by volume
    return markets
      .filter(m => m.active && !m.closed && m.liquidity > 1000)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  // Update config
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
