// Polymarket Types

export interface Market {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  liquidity: number;
  volume: number;
  outcomes: Outcome[];
  active: boolean;
  closed: boolean;
}

export interface Outcome {
  id: string;
  name: string;
  price: number; // 0-1 representing probability
}

export interface Position {
  marketId: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Trade {
  id: string;
  timestamp: Date;
  marketId: string;
  marketQuestion: string;
  outcome: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';
}

export interface BettingOpportunity {
  market: Market;
  outcome: Outcome;
  strategy: 'UNDERVALUED' | 'OVERVALUED';
  recommendedBet: 'YES' | 'NO';
  confidence: number;
  suggestedAmount: number;
  expectedValue: number;
}

export interface SafetyLimits {
  maxBetSize: number;
  maxDailyLoss: number;
  maxTotalExposure: number;
  maxPositionPercent: number; // max % of bankroll in single market
  minLiquidity: number;
}

export interface AgentState {
  isRunning: boolean;
  bankroll: number;
  todayPnL: number;
  totalPnL: number;
  positions: Position[];
  trades: Trade[];
  opportunities: BettingOpportunity[];
  safetyTriggered: boolean;
  safetyReason?: string;
}

export interface AgentConfig {
  apiKey: string;
  apiSecret: string;
  walletAddress: string;
  safetyLimits: SafetyLimits;
  undervaluedThreshold: number; // e.g., 0.30 = bet YES when price < 30%
  overvaluedThreshold: number;  // e.g., 0.80 = bet NO when price > 80%
  scanIntervalMs: number;
  autoExecute: boolean;
}
