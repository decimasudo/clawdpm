// Auto Executor - Real Data + Simulation Mode
import type {
  AgentState,
  AgentConfig,
  BettingOpportunity,
  Trade,
} from '@/types/polymarket';
import { getAPI } from './polymarket-api';
import { RiskManager } from './risk-manager';
import { MarketScanner } from './market-scanner';
import { getLLMAnalyzer } from './llm-analyzer';
import { getNotificationService } from './notification-service';

export class AutoExecutor {
  private config: AgentConfig;
  private riskManager: RiskManager;
  private scanner: MarketScanner;
  private state: AgentState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (state: AgentState) => void;
  private simulationMode: boolean = true; // Default to simulation

  constructor(config: AgentConfig, onStateChange?: (state: AgentState) => void) {
    this.config = config;
    this.riskManager = new RiskManager(config.safetyLimits);
    this.scanner = new MarketScanner(config);
    this.onStateChange = onStateChange;
    this.simulationMode = config.simulationMode !== false;

    this.state = {
      isRunning: false,
      bankroll: 1000,
      todayPnL: 0,
      totalPnL: 0,
      positions: [],
      trades: [],
      opportunities: [],
      safetyTriggered: false,
      isSimulationMode: this.simulationMode,
      marketsScanned: 0,
    };
  }

  // [BARU] Method yang sebelumnya hilang
  updateConfig(newConfig: AgentConfig): void {
    this.config = newConfig;
    this.simulationMode = newConfig.simulationMode !== false;
    
    // Update sub-modules
    if (this.riskManager) {
        this.riskManager.updateLimits(newConfig.safetyLimits);
    }
    if (this.scanner) {
        this.scanner.updateConfig(newConfig);
    }

    console.log('[Executor] Configuration updated');
  }

  // Start the autonomous execution loop
  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.safetyTriggered = false;
    this.state.safetyReason = undefined;
    this.state.isSimulationMode = this.simulationMode;
    this.notifyStateChange();

    console.log(`[Executor] Agent started in ${this.simulationMode ? 'SIMULATION' : 'LIVE'} mode`);

    // Run immediately
    this.executionCycle();

    // Then run on interval
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
    console.log('[Executor] Agent stopped');
  }

  // Main execution cycle
  private async executionCycle(): Promise<void> {
    console.log('[Executor] Scanning markets...');

    // Check safety limits
    const safetyCheck = this.riskManager.isSafetyBreached(this.state);
    if (safetyCheck.breached) {
      console.log(`[Safety] Limit reached: ${safetyCheck.reason}`);
      this.state.safetyTriggered = true;
      this.state.safetyReason = safetyCheck.reason;

      // Notify
      const notif = getNotificationService();
      if (notif) {
        await notif.notifySafetyStop(safetyCheck.reason || 'Unknown', this.state);
      }

      this.stop();
      return;
    }

    try {
      // Fetch REAL markets from Polymarket
      const api = getAPI();
      const markets = await api.getMarkets(30);
      this.state.marketsScanned = markets.length;
      this.state.lastScanTime = new Date();

      console.log(`[Executor] Fetched ${markets.length} real markets`);

      // Try LLM analysis if available
      const llm = getLLMAnalyzer();
      let opportunities: BettingOpportunity[] = [];

      if (llm) {
        // Analyze top markets with LLM
        const topMarkets = markets.slice(0, 10);
        const analyses = await llm.analyzeMarkets(topMarkets, 2);

        opportunities = analyses
          .map(a => llm.analysisToOpportunity(a))
          .filter(Boolean) as BettingOpportunity[];

        console.log(`[LLM] Found ${opportunities.length} opportunities`);
      }

      // Fallback to rule-based scanning
      if (opportunities.length === 0) {
        opportunities = await this.scanner.scanForOpportunities();
      }

      // Sort by expected value
      opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
      this.state.opportunities = opportunities.slice(0, 10);

      // Execute if auto-execute is enabled
      if (this.config.autoExecute && opportunities.length > 0) {
        const topOpp = opportunities.slice(0, 2);
        for (const opp of topOpp) {
          await this.executeOpportunity(opp);
        }
      }

      // Update positions
      await this.updatePositionsPnL();

    } catch (error) {
      console.error('[Executor] Cycle error:', error);
    }

    this.notifyStateChange();
  }

  // Execute a single opportunity
  private async executeOpportunity(opportunity: BettingOpportunity): Promise<void> {
    // Validate
    const validation = this.riskManager.validateOpportunity(opportunity);
    if (!validation.valid) {
      console.log(`[Executor] Skipping: ${validation.reason}`);
      return;
    }

    // Calculate bet size
    const betSize = this.riskManager.calculatePositionSize(opportunity, this.state);
    if (betSize <= 0) return;

    console.log(`[Trade] ${this.simulationMode ? 'SIM' : 'LIVE'} ${opportunity.recommendedBet} on "${opportunity.market.question.slice(0, 50)}..." - $${betSize.toFixed(2)}`);

    // Create trade
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      marketId: opportunity.market.id,
      marketQuestion: opportunity.market.question,
      outcome: opportunity.recommendedBet,
      side: 'BUY',
      shares: betSize / opportunity.outcome.price,
      price: opportunity.outcome.price,
      total: betSize,
      status: 'PENDING',
      isSimulated: this.simulationMode,
      reasoning: opportunity.reasoning,
    };

    this.state.trades.unshift(trade);
    this.notifyStateChange();

    // Execute based on mode
    if (this.simulationMode) {
      await this.executeSimulatedTrade(trade, opportunity);
    } else {
      await this.executeLiveTrade(trade, opportunity);
    }

    // Notify
    const notif = getNotificationService();
    if (notif) {
      await notif.notifyTrade(trade);
    }
  }

  // Simulated trade execution (looks real but doesn't trade)
  private async executeSimulatedTrade(trade: Trade, opportunity: BettingOpportunity): Promise<void> {
    // Realistic delay (300-800ms)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

    // 98% success rate in simulation
    const success = Math.random() > 0.02;

    if (success) {
      // Simulate slippage (0-1%)
      const slippage = 1 + (Math.random() * 0.01);
      trade.price = Math.min(0.99, opportunity.outcome.price * slippage);
      trade.shares = trade.total / trade.price;
      trade.status = 'FILLED';

      this.addPosition(trade, opportunity);
      this.state.bankroll -= trade.total;

      console.log(`[SIM] Filled: ${trade.shares.toFixed(2)} shares @ ${(trade.price * 100).toFixed(1)}%`);
    } else {
      trade.status = 'FAILED';
      console.log('[SIM] Trade failed (simulated rejection)');
    }
  }

  // Live trade execution
  private async executeLiveTrade(trade: Trade, opportunity: BettingOpportunity): Promise<void> {
    const api = getAPI();

    if (!api.hasCredentials()) {
      console.log('[Executor] No API credentials - falling back to simulation');
      trade.isSimulated = true;
      return this.executeSimulatedTrade(trade, opportunity);
    }

    const result = await api.placeOrder({
      tokenId: opportunity.outcome.id,
      side: 'BUY',
      size: trade.shares,
    });

    if (result.success) {
      trade.status = 'FILLED';
      this.addPosition(trade, opportunity);
      this.state.bankroll -= trade.total;
      console.log(`[LIVE] Trade filled: ${result.orderId}`);
    } else {
      trade.status = 'FAILED';
      console.error(`[LIVE] Trade failed: ${result.error}`);
    }
  }

  // Add or update position
  private addPosition(trade: Trade, opportunity: BettingOpportunity): void {
    const existing = this.state.positions.find(
      p => p.marketId === trade.marketId && p.outcome === trade.outcome
    );

    if (existing) {
      const totalShares = existing.shares + trade.shares;
      const totalCost = (existing.shares * existing.avgPrice) + trade.total;
      existing.shares = totalShares;
      existing.avgPrice = totalCost / totalShares;
      existing.isSimulated = trade.isSimulated;
    } else {
      this.state.positions.push({
        marketId: trade.marketId,
        marketQuestion: trade.marketQuestion,
        outcome: trade.outcome,
        shares: trade.shares,
        avgPrice: trade.price,
        currentPrice: trade.price,
        pnl: 0,
        pnlPercent: 0,
        isSimulated: trade.isSimulated,
      });
    }
  }

  // Update P&L with realistic price movements
  private async updatePositionsPnL(): Promise<void> {
    for (const position of this.state.positions) {
      if (this.simulationMode || position.isSimulated) {
        // Simulate realistic price movement
        // Random walk with slight drift based on our entry
        const volatility = 0.02 + Math.random() * 0.03;
        const drift = (Math.random() - 0.45) * volatility; // Slight positive bias
        const newPrice = position.currentPrice + drift;

        // Clamp to realistic bounds
        position.currentPrice = Math.max(0.01, Math.min(0.99, newPrice));
      } else {
        // Fetch real prices
        try {
          const api = getAPI();
          const prices = await api.getPrices(position.marketId);
          if (prices.mid > 0) {
            position.currentPrice = prices.mid;
          }
        } catch (e) {
          console.error('[Price] Fetch error:', e);
        }
      }

      // Calculate P&L
      const currentValue = position.shares * position.currentPrice;
      const costBasis = position.shares * position.avgPrice;
      position.pnl = currentValue - costBasis;
      position.pnlPercent = costBasis > 0 ? (position.pnl / costBasis) * 100 : 0;
    }

    // Total P&L
    const totalPnL = this.state.positions.reduce((sum, p) => sum + p.pnl, 0);
    this.state.todayPnL = totalPnL;
    this.state.totalPnL = totalPnL;
  }

  // Getters/Setters
  getState(): AgentState {
    return { ...this.state };
  }

  setBankroll(amount: number): void {
    this.state.bankroll = amount;
    this.notifyStateChange();
  }

  setSimulationMode(enabled: boolean): void {
    this.simulationMode = enabled;
    this.state.isSimulationMode = enabled;
    this.notifyStateChange();
  }

  isSimulating(): boolean {
    return this.simulationMode;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}