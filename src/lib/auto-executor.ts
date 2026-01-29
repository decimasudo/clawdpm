// Auto Executor - Executes trades autonomously
import type {
  AgentState,
  AgentConfig,
  BettingOpportunity,
  Trade,
  Position
} from '@/types/polymarket';
import { getAPI } from './polymarket-api';
import { RiskManager, DEFAULT_SAFETY_LIMITS } from './risk-manager';
import { MarketScanner } from './market-scanner';

export class AutoExecutor {
  private config: AgentConfig;
  private riskManager: RiskManager;
  private scanner: MarketScanner;
  private state: AgentState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (state: AgentState) => void;

  constructor(config: AgentConfig, onStateChange?: (state: AgentState) => void) {
    this.config = config;
    this.riskManager = new RiskManager(config.safetyLimits);
    this.scanner = new MarketScanner(config);
    this.onStateChange = onStateChange;

    this.state = {
      isRunning: false,
      bankroll: 100, // Default starting bankroll
      todayPnL: 0,
      totalPnL: 0,
      positions: [],
      trades: [],
      opportunities: [],
      safetyTriggered: false,
    };
  }

  // Start the autonomous execution loop
  start(): void {
    if (this.state.isRunning) {
      console.log('Executor already running');
      return;
    }

    this.state.isRunning = true;
    this.state.safetyTriggered = false;
    this.state.safetyReason = undefined;
    this.notifyStateChange();

    console.log('🤖 Auto Executor started');

    // Run immediately, then on interval
    this.executionCycle();

    this.intervalId = setInterval(
      () => this.executionCycle(),
      this.config.scanIntervalMs
    );
  }

  // Stop the execution loop
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.isRunning = false;
    this.notifyStateChange();
    console.log('🛑 Auto Executor stopped');
  }

  // Main execution cycle
  private async executionCycle(): Promise<void> {
    console.log('📊 Running execution cycle...');

    // Check safety limits
    const safetyCheck = this.riskManager.isSafetyBreached(this.state);
    if (safetyCheck.breached) {
      console.log(`⚠️ Safety limit breached: ${safetyCheck.reason}`);
      this.state.safetyTriggered = true;
      this.state.safetyReason = safetyCheck.reason;
      this.stop();
      return;
    }

    // Scan for opportunities
    const opportunities = await this.scanner.scanForOpportunities();
    this.state.opportunities = opportunities;

    console.log(`Found ${opportunities.length} opportunities`);

    // Execute if auto-execute is enabled
    if (this.config.autoExecute && opportunities.length > 0) {
      // Take top 3 opportunities
      const topOpportunities = opportunities.slice(0, 3);

      for (const opp of topOpportunities) {
        await this.executeOpportunity(opp);
      }
    }

    // Update positions P&L
    await this.updatePositionsPnL();

    this.notifyStateChange();
  }

  // Execute a single opportunity
  private async executeOpportunity(opportunity: BettingOpportunity): Promise<void> {
    const api = getAPI();
    if (!api) {
      console.error('API not initialized');
      return;
    }

    // Validate opportunity
    const validation = this.riskManager.validateOpportunity(opportunity);
    if (!validation.valid) {
      console.log(`Skipping opportunity: ${validation.reason}`);
      return;
    }

    // Calculate position size
    const betSize = this.riskManager.calculatePositionSize(opportunity, this.state);
    if (betSize <= 0) {
      console.log('Bet size is 0, skipping');
      return;
    }

    console.log(`🎯 Executing: ${opportunity.recommendedBet} on "${opportunity.market.question}" for $${betSize.toFixed(2)}`);

    // Create trade record
    const trade: Trade = {
      id: `trade-${Date.now()}`,
      timestamp: new Date(),
      marketId: opportunity.market.id,
      marketQuestion: opportunity.market.question,
      outcome: opportunity.outcome.name,
      side: 'BUY',
      shares: betSize / opportunity.outcome.price,
      price: opportunity.outcome.price,
      total: betSize,
      status: 'PENDING',
    };

    this.state.trades.unshift(trade);

    // Execute the trade (in demo mode, simulate)
    if (!this.config.apiKey || this.config.apiKey === 'demo') {
      // Simulate execution
      await this.simulateTrade(trade, opportunity);
    } else {
      // Real execution
      const result = await api.placeOrder({
        tokenId: opportunity.outcome.id,
        side: 'BUY',
        size: trade.shares,
      });

      if (result.success) {
        trade.status = 'FILLED';
        this.addPosition(trade, opportunity);
        this.state.bankroll -= trade.total;
      } else {
        trade.status = 'FAILED';
        console.error(`Trade failed: ${result.error}`);
      }
    }

    this.notifyStateChange();
  }

  // Simulate trade execution (for demo mode)
  private async simulateTrade(trade: Trade, opportunity: BettingOpportunity): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // 95% success rate in simulation
    if (Math.random() > 0.05) {
      trade.status = 'FILLED';
      this.addPosition(trade, opportunity);
      this.state.bankroll -= trade.total;
      console.log(`✅ Trade filled: ${trade.shares.toFixed(2)} shares at ${trade.price.toFixed(3)}`);
    } else {
      trade.status = 'FAILED';
      console.log('❌ Trade failed (simulated)');
    }
  }

  // Add or update position
  private addPosition(trade: Trade, opportunity: BettingOpportunity): void {
    const existingPosition = this.state.positions.find(
      p => p.marketId === trade.marketId && p.outcome === trade.outcome
    );

    if (existingPosition) {
      // Update existing position
      const totalShares = existingPosition.shares + trade.shares;
      const totalCost = (existingPosition.shares * existingPosition.avgPrice) + trade.total;
      existingPosition.shares = totalShares;
      existingPosition.avgPrice = totalCost / totalShares;
    } else {
      // Create new position
      const position: Position = {
        marketId: trade.marketId,
        marketQuestion: trade.marketQuestion,
        outcome: trade.outcome,
        shares: trade.shares,
        avgPrice: trade.price,
        currentPrice: trade.price,
        pnl: 0,
        pnlPercent: 0,
      };
      this.state.positions.push(position);
    }
  }

  // Update P&L for all positions
  private async updatePositionsPnL(): Promise<void> {
    const api = getAPI();

    for (const position of this.state.positions) {
      // In real mode, fetch current prices
      if (api && this.config.apiKey && this.config.apiKey !== 'demo') {
        try {
          const prices = await api.getPrices(position.marketId);
          position.currentPrice = prices.mid;
        } catch (error) {
          console.error('Error fetching prices:', error);
        }
      } else {
        // Simulate price movement
        const drift = (Math.random() - 0.48) * 0.05; // Slight upward bias
        position.currentPrice = Math.max(0.01, Math.min(0.99,
          position.currentPrice + drift
        ));
      }

      // Calculate P&L
      const currentValue = position.shares * position.currentPrice;
      const costBasis = position.shares * position.avgPrice;
      position.pnl = currentValue - costBasis;
      position.pnlPercent = costBasis > 0 ? (position.pnl / costBasis) * 100 : 0;
    }

    // Update total P&L
    const totalPositionPnL = this.state.positions.reduce((sum, p) => sum + p.pnl, 0);
    this.state.todayPnL = totalPositionPnL;
    this.state.totalPnL = totalPositionPnL;
  }

  // Get current state
  getState(): AgentState {
    return { ...this.state };
  }

  // Update bankroll manually
  setBankroll(amount: number): void {
    this.state.bankroll = amount;
    this.notifyStateChange();
  }

  // Notify state change
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
