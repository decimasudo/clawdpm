// Risk Calculator & Safety Manager
import type {
  SafetyLimits,
  AgentState,
  BettingOpportunity,
  Position
} from '@/types/polymarket';

export class RiskManager {
  private limits: SafetyLimits;

  constructor(limits: SafetyLimits) {
    this.limits = limits;
  }

  // Kelly Criterion for optimal bet sizing
  // f* = (bp - q) / b
  // where: b = odds received, p = probability of winning, q = 1-p
  calculateKellyBet(
    probability: number, // your estimated true probability
    marketPrice: number, // current market price (implied probability)
    bankroll: number
  ): number {
    // If betting YES: odds = (1 - marketPrice) / marketPrice
    // If betting NO: odds = marketPrice / (1 - marketPrice)

    const isUndervalued = probability > marketPrice;

    let odds: number;
    let p: number;

    if (isUndervalued) {
      // Betting YES
      odds = (1 - marketPrice) / marketPrice;
      p = probability;
    } else {
      // Betting NO
      odds = marketPrice / (1 - marketPrice);
      p = 1 - probability;
    }

    const q = 1 - p;
    const kelly = (odds * p - q) / odds;

    // Use fractional Kelly (half Kelly for safety)
    const fractionalKelly = kelly * 0.5;

    // Clamp to reasonable bounds
    const betFraction = Math.max(0, Math.min(fractionalKelly, 0.1)); // Max 10% of bankroll

    return bankroll * betFraction;
  }

  // Calculate position size based on risk limits
  calculatePositionSize(
    opportunity: BettingOpportunity,
    state: AgentState
  ): number {
    const { bankroll, positions, todayPnL } = state;

    // Check if safety limits are breached
    if (this.isSafetyBreached(state).breached) {
      return 0;
    }

    // Calculate current exposure
    const totalExposure = positions.reduce((sum, p) => sum + (p.shares * p.avgPrice), 0);
    const remainingExposure = this.limits.maxTotalExposure - totalExposure;

    // Calculate market-specific exposure
    const marketPositions = positions.filter(p => p.marketId === opportunity.market.id);
    const marketExposure = marketPositions.reduce((sum, p) => sum + (p.shares * p.avgPrice), 0);
    const maxMarketExposure = bankroll * this.limits.maxPositionPercent;
    const remainingMarketExposure = maxMarketExposure - marketExposure;

    // Kelly-based suggestion
    const kellyBet = this.calculateKellyBet(
      opportunity.confidence,
      opportunity.outcome.price,
      bankroll
    );

    // Take the minimum of all constraints
    const suggestedSize = Math.min(
      kellyBet,
      this.limits.maxBetSize,
      remainingExposure,
      remainingMarketExposure,
      bankroll * 0.05 // Never bet more than 5% in single trade
    );

    return Math.max(0, Math.floor(suggestedSize * 100) / 100); // Round to 2 decimals
  }

  // Check if safety limits are breached
  isSafetyBreached(state: AgentState): { breached: boolean; reason?: string } {
    const { bankroll, todayPnL, positions } = state;

    // Check daily loss limit
    if (todayPnL < -this.limits.maxDailyLoss) {
      return {
        breached: true,
        reason: `Daily loss limit reached: $${Math.abs(todayPnL).toFixed(2)} > $${this.limits.maxDailyLoss}`
      };
    }

    // Check total exposure
    const totalExposure = positions.reduce((sum, p) => sum + (p.shares * p.avgPrice), 0);
    if (totalExposure >= this.limits.maxTotalExposure) {
      return {
        breached: true,
        reason: `Maximum exposure reached: $${totalExposure.toFixed(2)}`
      };
    }

    // Check if bankroll is too low
    if (bankroll < this.limits.maxBetSize) {
      return {
        breached: true,
        reason: `Bankroll too low: $${bankroll.toFixed(2)}`
      };
    }

    return { breached: false };
  }

  // Calculate expected value of a bet
  calculateExpectedValue(
    betAmount: number,
    winProbability: number,
    marketPrice: number,
    side: 'YES' | 'NO'
  ): number {
    if (side === 'YES') {
      // Win: get (1/marketPrice) * betAmount
      // Lose: lose betAmount
      const potentialWin = (1 / marketPrice - 1) * betAmount;
      const ev = winProbability * potentialWin - (1 - winProbability) * betAmount;
      return ev;
    } else {
      // Betting NO
      const noPrice = 1 - marketPrice;
      const potentialWin = (1 / noPrice - 1) * betAmount;
      const ev = (1 - winProbability) * potentialWin - winProbability * betAmount;
      return ev;
    }
  }

  // Validate opportunity meets minimum criteria
  validateOpportunity(opportunity: BettingOpportunity): { valid: boolean; reason?: string } {
    // Check liquidity
    if (opportunity.market.liquidity < this.limits.minLiquidity) {
      return {
        valid: false,
        reason: `Insufficient liquidity: $${opportunity.market.liquidity.toFixed(0)} < $${this.limits.minLiquidity}`
      };
    }

    // Check if market is active
    if (!opportunity.market.active || opportunity.market.closed) {
      return { valid: false, reason: 'Market is not active' };
    }

    // Check if expected value is positive
    if (opportunity.expectedValue <= 0) {
      return { valid: false, reason: 'Negative expected value' };
    }

    // Check minimum confidence threshold
    if (opportunity.confidence < 0.55) {
      return { valid: false, reason: 'Confidence too low' };
    }

    return { valid: true };
  }

  // Get current limits
  getLimits(): SafetyLimits {
    return { ...this.limits };
  }

  // Update limits dynamically
  updateLimits(newLimits: Partial<SafetyLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
  }

  // Calculate dynamic limits based on recent performance
  calculateDynamicLimits(state: AgentState): SafetyLimits {
    const { bankroll, todayPnL, totalPnL } = state;

    // If on a losing streak, reduce limits
    const isLosingStreak = todayPnL < 0 && totalPnL < 0;
    const multiplier = isLosingStreak ? 0.5 : 1.0;

    return {
      maxBetSize: Math.min(this.limits.maxBetSize, bankroll * 0.02) * multiplier,
      maxDailyLoss: this.limits.maxDailyLoss,
      maxTotalExposure: Math.min(this.limits.maxTotalExposure, bankroll * 0.3) * multiplier,
      maxPositionPercent: this.limits.maxPositionPercent * multiplier,
      minLiquidity: this.limits.minLiquidity,
    };
  }
}

// Default safety limits
export const DEFAULT_SAFETY_LIMITS: SafetyLimits = {
  maxBetSize: 10,           // $10 max per bet
  maxDailyLoss: 50,         // Stop if down $50 today
  maxTotalExposure: 200,    // Max $200 at risk
  maxPositionPercent: 0.1,  // Max 10% of bankroll in single market
  minLiquidity: 1000,       // Only trade markets with >$1000 liquidity
};
