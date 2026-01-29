// Notification Service - Telegram & Discord alerts
import type { Trade, BettingOpportunity, AgentState } from '@/types/polymarket';

interface NotificationConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  enabled: boolean;
  notifyOnTrade: boolean;
  notifyOnOpportunity: boolean;
  notifyOnSafetyStop: boolean;
  notifyOnDailySummary: boolean;
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      enabled: false,
      notifyOnTrade: true,
      notifyOnOpportunity: false,
      notifyOnSafetyStop: true,
      notifyOnDailySummary: true,
      ...config,
    };
  }

  // Send Telegram message
  private async sendTelegram(message: string): Promise<boolean> {
    if (!this.config.telegramBotToken || !this.config.telegramChatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram notification failed:', error);
      return false;
    }
  }

  // Send Discord message
  private async sendDiscord(message: string, embed?: any): Promise<boolean> {
    if (!this.config.discordWebhookUrl) {
      return false;
    }

    try {
      const payload: any = { content: message };
      if (embed) {
        payload.embeds = [embed];
      }

      const response = await fetch(this.config.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }

  // Send to all configured channels
  private async broadcast(message: string, discordEmbed?: any): Promise<void> {
    if (!this.config.enabled) return;

    const promises = [];

    if (this.config.telegramBotToken && this.config.telegramChatId) {
      promises.push(this.sendTelegram(message));
    }

    if (this.config.discordWebhookUrl) {
      promises.push(this.sendDiscord(message, discordEmbed));
    }

    await Promise.allSettled(promises);
  }

  // Notify on trade execution
  async notifyTrade(trade: Trade): Promise<void> {
    if (!this.config.notifyOnTrade) return;

    const emoji = trade.status === 'FILLED' ? '✅' : trade.status === 'FAILED' ? '❌' : '⏳';
    const message = `
${emoji} <b>Trade ${trade.status}</b>

📊 <b>Market:</b> ${trade.marketQuestion.slice(0, 50)}...
🎯 <b>Side:</b> ${trade.side} ${trade.outcome}
💰 <b>Amount:</b> $${trade.total.toFixed(2)}
📈 <b>Price:</b> ${(trade.price * 100).toFixed(1)}%
🔢 <b>Shares:</b> ${trade.shares.toFixed(2)}
🕐 <b>Time:</b> ${new Date(trade.timestamp).toLocaleString()}
    `.trim();

    const discordEmbed = {
      title: `${emoji} Trade ${trade.status}`,
      color: trade.status === 'FILLED' ? 0x00ff00 : trade.status === 'FAILED' ? 0xff0000 : 0xffff00,
      fields: [
        { name: 'Market', value: trade.marketQuestion.slice(0, 100), inline: false },
        { name: 'Side', value: `${trade.side} ${trade.outcome}`, inline: true },
        { name: 'Amount', value: `$${trade.total.toFixed(2)}`, inline: true },
        { name: 'Price', value: `${(trade.price * 100).toFixed(1)}%`, inline: true },
      ],
      timestamp: new Date(trade.timestamp).toISOString(),
    };

    await this.broadcast(message, discordEmbed);
  }

  // Notify on new opportunity found
  async notifyOpportunity(opportunity: BettingOpportunity): Promise<void> {
    if (!this.config.notifyOnOpportunity) return;

    const message = `
🎯 <b>New Opportunity Found</b>

📊 <b>Market:</b> ${opportunity.market.question.slice(0, 50)}...
📈 <b>Strategy:</b> ${opportunity.strategy}
🎲 <b>Bet:</b> ${opportunity.recommendedBet}
💹 <b>Price:</b> ${(opportunity.outcome.price * 100).toFixed(1)}%
📊 <b>Confidence:</b> ${(opportunity.confidence * 100).toFixed(1)}%
💰 <b>Expected Value:</b> +${(opportunity.expectedValue * 100).toFixed(1)}%
    `.trim();

    await this.broadcast(message);
  }

  // Notify on safety stop
  async notifySafetyStop(reason: string, state: AgentState): Promise<void> {
    if (!this.config.notifyOnSafetyStop) return;

    const message = `
🚨 <b>SAFETY STOP TRIGGERED</b>

⚠️ <b>Reason:</b> ${reason}

📊 <b>Current Status:</b>
💰 Bankroll: $${state.bankroll.toFixed(2)}
📉 Today's P&L: $${state.todayPnL.toFixed(2)}
📈 Total P&L: $${state.totalPnL.toFixed(2)}
📋 Open Positions: ${state.positions.length}

🤖 Agent has been stopped automatically.
    `.trim();

    const discordEmbed = {
      title: '🚨 Safety Stop Triggered',
      color: 0xff0000,
      description: reason,
      fields: [
        { name: 'Bankroll', value: `$${state.bankroll.toFixed(2)}`, inline: true },
        { name: "Today's P&L", value: `$${state.todayPnL.toFixed(2)}`, inline: true },
        { name: 'Open Positions', value: state.positions.length.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.broadcast(message, discordEmbed);
  }

  // Daily summary notification
  async notifyDailySummary(state: AgentState): Promise<void> {
    if (!this.config.notifyOnDailySummary) return;

    const winningTrades = state.trades.filter(t => t.status === 'FILLED').length;
    const totalTrades = state.trades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : '0';

    const message = `
📊 <b>Daily Summary</b>

💰 <b>Bankroll:</b> $${state.bankroll.toFixed(2)}
📈 <b>Today's P&L:</b> ${state.todayPnL >= 0 ? '+' : ''}$${state.todayPnL.toFixed(2)}
📊 <b>Total P&L:</b> ${state.totalPnL >= 0 ? '+' : ''}$${state.totalPnL.toFixed(2)}

📋 <b>Trades Today:</b> ${totalTrades}
✅ <b>Win Rate:</b> ${winRate}%
🎯 <b>Open Positions:</b> ${state.positions.length}
💡 <b>Opportunities Found:</b> ${state.opportunities.length}
    `.trim();

    await this.broadcast(message);
  }

  // Agent started notification
  async notifyAgentStarted(): Promise<void> {
    const message = `
🤖 <b>Polymarket Agent Started</b>

✅ Agent is now scanning for opportunities
⏰ ${new Date().toLocaleString()}
    `.trim();

    await this.broadcast(message);
  }

  // Agent stopped notification
  async notifyAgentStopped(): Promise<void> {
    const message = `
🛑 <b>Polymarket Agent Stopped</b>

⏰ ${new Date().toLocaleString()}
    `.trim();

    await this.broadcast(message);
  }

  // Update config
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current config
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Test connection
  async testConnection(): Promise<{ telegram: boolean; discord: boolean }> {
    const results = { telegram: false, discord: false };

    if (this.config.telegramBotToken && this.config.telegramChatId) {
      results.telegram = await this.sendTelegram('🧪 Test notification from Polymarket Agent');
    }

    if (this.config.discordWebhookUrl) {
      results.discord = await this.sendDiscord('🧪 Test notification from Polymarket Agent');
    }

    return results;
  }
}

// Singleton instance
let notificationInstance: NotificationService | null = null;

export const initNotificationService = (config?: Partial<NotificationConfig>): NotificationService => {
  notificationInstance = new NotificationService(config);
  return notificationInstance;
};

export const getNotificationService = (): NotificationService | null => notificationInstance;
