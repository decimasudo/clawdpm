import { useState, useEffect, useCallback } from 'react';
import type { AgentState, AgentConfig, SafetyLimits } from '@/types/polymarket';
import { initializeAPI } from '@/lib/polymarket-api';
import { AutoExecutor } from '@/lib/auto-executor';
import { DEFAULT_SAFETY_LIMITS } from '@/lib/risk-manager';
import { initLLMAnalyzer, getLLMAnalyzer } from '@/lib/llm-analyzer';
import { initNotificationService, getNotificationService } from '@/lib/notification-service';
import {
  Play,
  Square,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  Target,
  Shield,
  RefreshCw,
  Bell,
  Brain,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Default config
const DEFAULT_CONFIG: AgentConfig = {
  apiKey: 'demo',
  apiSecret: '',
  walletAddress: '',
  safetyLimits: DEFAULT_SAFETY_LIMITS,
  undervaluedThreshold: 0.30,
  overvaluedThreshold: 0.75,
  scanIntervalMs: 30000,
  autoExecute: true,
};

// Extended config with new features
interface ExtendedConfig extends AgentConfig {
  openaiApiKey: string;
  useLLMAnalysis: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  discordWebhookUrl: string;
  notificationsEnabled: boolean;
}

const DEFAULT_EXTENDED_CONFIG: ExtendedConfig = {
  ...DEFAULT_CONFIG,
  openaiApiKey: '',
  useLLMAnalysis: false,
  telegramBotToken: '',
  telegramChatId: '',
  discordWebhookUrl: '',
  notificationsEnabled: false,
};

export default function Dashboard() {
  const [config, setConfig] = useState<ExtendedConfig>(DEFAULT_EXTENDED_CONFIG);
  const [state, setState] = useState<AgentState>({
    isRunning: false,
    bankroll: 100,
    todayPnL: 0,
    totalPnL: 0,
    positions: [],
    trades: [],
    opportunities: [],
    safetyTriggered: false,
  });
  const [executor, setExecutor] = useState<AutoExecutor | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'ai' | 'notifications'>('general');
  const [activeTab, setActiveTab] = useState<'opportunities' | 'positions' | 'trades'>('opportunities');
  const [testingNotification, setTestingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ telegram: boolean; discord: boolean } | null>(null);

  // Initialize executor and services
  useEffect(() => {
    initializeAPI(config.apiKey, config.apiSecret);
    initLLMAnalyzer(config.openaiApiKey);
    initNotificationService({
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      discordWebhookUrl: config.discordWebhookUrl,
      enabled: config.notificationsEnabled,
    });

    const exec = new AutoExecutor(config, (newState) => {
      setState(newState);
    });
    exec.setBankroll(100);
    setExecutor(exec);

    return () => {
      exec.stop();
    };
  }, []);

  // Update services when config changes
  useEffect(() => {
    const llm = getLLMAnalyzer();
    if (llm) {
      llm.setApiKey(config.openaiApiKey);
    }

    const notif = getNotificationService();
    if (notif) {
      notif.updateConfig({
        telegramBotToken: config.telegramBotToken,
        telegramChatId: config.telegramChatId,
        discordWebhookUrl: config.discordWebhookUrl,
        enabled: config.notificationsEnabled,
      });
    }
  }, [config.openaiApiKey, config.telegramBotToken, config.telegramChatId, config.discordWebhookUrl, config.notificationsEnabled]);

  const handleStart = useCallback(async () => {
    if (executor) {
      executor.start();
      const notif = getNotificationService();
      if (notif && config.notificationsEnabled) {
        await notif.notifyAgentStarted();
      }
    }
  }, [executor, config.notificationsEnabled]);

  const handleStop = useCallback(async () => {
    if (executor) {
      executor.stop();
      const notif = getNotificationService();
      if (notif && config.notificationsEnabled) {
        await notif.notifyAgentStopped();
      }
    }
  }, [executor, config.notificationsEnabled]);

  const handleConfigChange = (key: keyof ExtendedConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSafetyLimitChange = (key: keyof SafetyLimits, value: number) => {
    setConfig(prev => ({
      ...prev,
      safetyLimits: { ...prev.safetyLimits, [key]: value }
    }));
  };

  const testNotifications = async () => {
    setTestingNotification(true);
    setNotificationResult(null);
    const notif = getNotificationService();
    if (notif) {
      const result = await notif.testConnection();
      setNotificationResult(result);
    }
    setTestingNotification(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Polymarket Agent</h1>
              <p className="text-xs text-gray-400">AI-Powered Autonomous Betting</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config.useLLMAnalysis && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 text-xs">
                <Brain className="w-3 h-3" />
                AI Mode
              </div>
            )}

            {config.notificationsEnabled && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-xs">
                <Bell className="w-3 h-3" />
                Alerts On
              </div>
            )}

            {state.safetyTriggered && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Safety Stop
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            {state.isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Agent
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Agent
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Bankroll"
            value={`$${state.bankroll.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Today's P&L"
            value={`${state.todayPnL >= 0 ? '+' : ''}$${state.todayPnL.toFixed(2)}`}
            icon={state.todayPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            color={state.todayPnL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="Open Positions"
            value={state.positions.length.toString()}
            icon={<Activity className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="Opportunities"
            value={state.opportunities.length.toString()}
            icon={<Target className="w-5 h-5" />}
            color="orange"
          />
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-6 bg-gray-900 border border-gray-800 rounded-xl">
            {/* Settings Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSettingsTab('general')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  settingsTab === 'general' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                General
              </button>
              <button
                onClick={() => setSettingsTab('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  settingsTab === 'ai' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Brain className="w-4 h-4" />
                AI Analysis
              </button>
              <button
                onClick={() => setSettingsTab('notifications')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  settingsTab === 'notifications' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Bell className="w-4 h-4" />
                Notifications
              </button>
            </div>

            {/* General Settings */}
            {settingsTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Polymarket API Key</label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                    placeholder="Enter API Key or 'demo'"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Undervalued Threshold</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="0.5"
                    value={config.undervaluedThreshold}
                    onChange={(e) => handleConfigChange('undervaluedThreshold', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bet YES when price &lt; this</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Overvalued Threshold</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="0.95"
                    value={config.overvaluedThreshold}
                    onChange={(e) => handleConfigChange('overvaluedThreshold', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bet NO when price &gt; this</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Bet Size ($)</label>
                  <input
                    type="number"
                    value={config.safetyLimits.maxBetSize}
                    onChange={(e) => handleSafetyLimitChange('maxBetSize', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Daily Loss ($)</label>
                  <input
                    type="number"
                    value={config.safetyLimits.maxDailyLoss}
                    onChange={(e) => handleSafetyLimitChange('maxDailyLoss', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Total Exposure ($)</label>
                  <input
                    type="number"
                    value={config.safetyLimits.maxTotalExposure}
                    onChange={(e) => handleSafetyLimitChange('maxTotalExposure', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* AI Settings */}
            {settingsTab === 'ai' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable AI Analysis</h4>
                    <p className="text-sm text-gray-400">Use LLM to analyze markets before betting</p>
                  </div>
                  <button
                    onClick={() => handleConfigChange('useLLMAnalysis', !config.useLLMAnalysis)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.useLLMAnalysis ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      config.useLLMAnalysis ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={config.openaiApiKey}
                    onChange={(e) => handleConfigChange('openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for AI analysis. Get it from platform.openai.com</p>
                </div>

                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="font-medium text-purple-400 mb-2">How AI Analysis Works</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• LLM analyzes each market question for context</li>
                    <li>• Estimates true probability based on reasoning</li>
                    <li>• Compares with market price to find mispricing</li>
                    <li>• Provides confidence score and key factors</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {settingsTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Notifications</h4>
                    <p className="text-sm text-gray-400">Get alerts on Telegram or Discord</p>
                  </div>
                  <button
                    onClick={() => handleConfigChange('notificationsEnabled', !config.notificationsEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      config.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-400" />
                      Telegram
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Bot Token</label>
                      <input
                        type="password"
                        value={config.telegramBotToken}
                        onChange={(e) => handleConfigChange('telegramBotToken', e.target.value)}
                        placeholder="123456:ABC-DEF..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Chat ID</label>
                      <input
                        type="text"
                        value={config.telegramChatId}
                        onChange={(e) => handleConfigChange('telegramChatId', e.target.value)}
                        placeholder="-1001234567890"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      Discord
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Webhook URL</label>
                      <input
                        type="password"
                        value={config.discordWebhookUrl}
                        onChange={(e) => handleConfigChange('discordWebhookUrl', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={testNotifications}
                    disabled={testingNotification}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors"
                  >
                    {testingNotification ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Test Notifications
                  </button>

                  {notificationResult && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${notificationResult.telegram ? 'text-green-400' : 'text-red-400'}`}>
                        {notificationResult.telegram ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        Telegram
                      </span>
                      <span className={`flex items-center gap-1 ${notificationResult.discord ? 'text-green-400' : 'text-red-400'}`}>
                        {notificationResult.discord ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        Discord
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['opportunities', 'positions', 'trades'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {activeTab === 'opportunities' && (
            <OpportunitiesTable opportunities={state.opportunities} />
          )}
          {activeTab === 'positions' && (
            <PositionsTable positions={state.positions} />
          )}
          {activeTab === 'trades' && (
            <TradesTable trades={state.trades} />
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  };

  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <span className={iconColors[color]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Opportunities Table
function OpportunitiesTable({ opportunities }: { opportunities: AgentState['opportunities'] }) {
  if (opportunities.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No opportunities found</p>
        <p className="text-sm">Start the agent to scan for opportunities</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Market</th>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Strategy</th>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Bet</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Price</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Confidence</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">EV</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {opportunities.map((opp, idx) => (
            <tr key={idx} className="hover:bg-gray-800/30">
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-xs">{opp.market.question}</p>
                <p className="text-xs text-gray-500">${opp.market.liquidity.toLocaleString()} liquidity</p>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  opp.strategy === 'UNDERVALUED'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {opp.strategy}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`font-bold ${
                  opp.recommendedBet === 'YES' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {opp.recommendedBet}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {(opp.outcome.price * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {(opp.confidence * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-green-400 font-mono">
                  +{(opp.expectedValue * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Positions Table
function PositionsTable({ positions }: { positions: AgentState['positions'] }) {
  if (positions.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No open positions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Market</th>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Outcome</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Shares</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Avg Price</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Current</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {positions.map((pos, idx) => (
            <tr key={idx} className="hover:bg-gray-800/30">
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-xs">{pos.marketQuestion}</p>
              </td>
              <td className="px-4 py-3 font-medium">{pos.outcome}</td>
              <td className="px-4 py-3 text-right font-mono">{pos.shares.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono">
                {(pos.avgPrice * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {(pos.currentPrice * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`font-mono font-medium ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  <span className="text-xs ml-1">({pos.pnlPercent.toFixed(1)}%)</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Trades Table
function TradesTable({ trades }: { trades: AgentState['trades'] }) {
  if (trades.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No trades yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Time</th>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Market</th>
            <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Side</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Shares</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Price</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Total</th>
            <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {trades.map((trade) => (
            <tr key={trade.id} className="hover:bg-gray-800/30">
              <td className="px-4 py-3 text-sm text-gray-400">
                {new Date(trade.timestamp).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-xs">{trade.marketQuestion}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`font-medium ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.side}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">{trade.shares.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono">{(trade.price * 100).toFixed(1)}%</td>
              <td className="px-4 py-3 text-right font-mono">${trade.total.toFixed(2)}</td>
              <td className="px-4 py-3 text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  trade.status === 'FILLED' ? 'bg-green-500/20 text-green-400' :
                  trade.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                  trade.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {trade.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
