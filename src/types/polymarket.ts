// src/types/polymarket.ts

export interface Market {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  liquidity: number;
  volume: number;
  outcomes: Outcome[];
  active: boolean;
  closed?: boolean;
  category?: string;
  image?: string;
}

export interface Outcome {
  id: string;
  name: string;
  price: number;
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
  isSimulated?: boolean;
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
  isSimulated?: boolean;
  reasoning?: string;
}

export interface BettingOpportunity {
  market: Market;
  outcome: Outcome;
  strategy: 'UNDERVALUED' | 'OVERVALUED';
  recommendedBet: 'YES' | 'NO';
  confidence: number;
  suggestedAmount: number;
  expectedValue: number;
  reasoning?: string;
  keyFactors?: string[];
}

export interface SafetyLimits {
  maxBetSize: number;
  maxDailyLoss: number;
  maxTotalExposure: number;
  maxPositionPercent: number;
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
  isSimulationMode?: boolean;
  marketsScanned?: number;
  lastScanTime?: Date;
}

export interface AgentConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string; // [BARU] Tambahkan field ini
  walletAddress: string;
  safetyLimits: SafetyLimits;
  undervaluedThreshold: number;
  overvaluedThreshold: number;
  scanIntervalMs: number;
  autoExecute: boolean;
  simulationMode?: boolean;
}