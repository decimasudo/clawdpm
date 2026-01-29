import { useState, useEffect, useCallback } from 'react';
import type { AgentState, AgentConfig, SafetyLimits } from '@/types/polymarket';
import { initializeAPI } from '@/lib/polymarket-api';
import { AutoExecutor } from '@/lib/auto-executor';
import { DEFAULT_SAFETY_LIMITS } from '@/lib/risk-manager';
import { initLLMAnalyzer, getLLMAnalyzer, OPENROUTER_MODELS } from '@/lib/llm-analyzer';
import { initNotificationService, getNotificationService } from '@/lib/notification-service';
import {
  Play, Square, Settings, Wallet, Activity, Target, Shield,
  RefreshCw, Bell, Brain, Send, CheckCircle, XCircle, Zap,
  BarChart3, Clock, Eye, Key, Search, ChevronRight, AlertCircle,
  TrendingUp, TrendingDown
} from 'lucide-react';

// --- Configuration ---

const DEFAULT_CONFIG: AgentConfig = {
  apiKey: '',
  apiSecret: '',
  passphrase: '',
  walletAddress: '',
  safetyLimits: DEFAULT_SAFETY_LIMITS,
  undervaluedThreshold: 0.30,
  overvaluedThreshold: 0.75,
  scanIntervalMs: 20000,
  autoExecute: true,
  simulationMode: true,
};

interface ExtendedConfig extends AgentConfig {
  openrouterApiKey: string;
  selectedModel: string;
  useLLMAnalysis: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  discordWebhookUrl: string;
  notificationsEnabled: boolean;
}

const DEFAULT_EXTENDED_CONFIG: ExtendedConfig = {
  ...DEFAULT_CONFIG,
  openrouterApiKey: '',
  selectedModel: 'google/gemini-2.0-flash-exp:free',
  useLLMAnalysis: true,
  telegramBotToken: '',
  telegramChatId: '',
  discordWebhookUrl: '',
  notificationsEnabled: false,
};

// --- Main Component ---

export default function Dashboard() {
  const [config, setConfig] = useState<ExtendedConfig>(DEFAULT_EXTENDED_CONFIG);
  const [state, setState] = useState<AgentState>({
    isRunning: false,
    bankroll: 1000,
    todayPnL: 0,
    totalPnL: 0,
    positions: [],
    trades: [],
    opportunities: [],
    safetyTriggered: false,
    isSimulationMode: true,
    marketsScanned: 0,
  });
  
  const [executor, setExecutor] = useState<AutoExecutor | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'positions' | 'trades'>('opportunities');
  const [settingsTab, setSettingsTab] = useState<'general' | 'ai' | 'notifications'>('general');
  const [testingNotification, setTestingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ telegram: boolean; discord: boolean } | null>(null);

  // Init System
  useEffect(() => {
    initializeAPI(config.apiKey, config.apiSecret, config.passphrase);
    initLLMAnalyzer(config.openrouterApiKey, 'openrouter', config.selectedModel);
    initNotificationService({
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      discordWebhookUrl: config.discordWebhookUrl,
      enabled: config.notificationsEnabled,
    });

    const exec = new AutoExecutor({ ...config, simulationMode: true }, setState);
    exec.setBankroll(1000);
    setExecutor(exec);

    return () => exec.stop();
  }, []);

  // Sync Config
  useEffect(() => {
    const llm = getLLMAnalyzer();
    if (llm) {
      llm.setApiKey(config.openrouterApiKey);
      llm.setModel(config.selectedModel);
    }
    if (config.apiKey && config.apiSecret && config.passphrase) {
        initializeAPI(config.apiKey, config.apiSecret, config.passphrase);
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
  }, [config]);

  const handleStart = useCallback(() => {
    if (executor) {
      executor.updateConfig({ ...config, simulationMode: config.simulationMode });
      executor.start();
    }
  }, [executor, config]);

  const handleStop = useCallback(() => {
    if (executor) executor.stop();
  }, [executor]);

  const handleConfigChange = (key: keyof ExtendedConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-gray-900 font-sans selection:bg-blue-100">
      
      {/* --- Header (Polymarket Style) --- */}
      <nav className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               {/* Logo Minimalis */}
               <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
               </div>
               <span className="text-lg font-bold tracking-tight">Polymarket<span className="text-blue-600">AI</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              <NavBadge active={state.isSimulationMode} label="Simulation" />
              <NavBadge active={!state.isSimulationMode} label="Live Trading" color="emerald" />
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Status Bar */}
             <div className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-500 mr-4">
                <span className="flex items-center gap-1.5">
                   <div className={`w-2 h-2 rounded-full ${state.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                   {state.isRunning ? 'Running' : 'Standby'}
                </span>
                <span className="flex items-center gap-1.5">
                   <Clock className="w-3.5 h-3.5" />
                   {state.lastScanTime ? state.lastScanTime.toLocaleTimeString() : '--:--'}
                </span>
             </div>

             <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded hover:bg-gray-100 text-gray-500 transition-colors ${showSettings ? 'bg-gray-100 text-gray-900' : ''}`}
             >
                <Settings className="w-5 h-5" />
             </button>

             {state.isRunning ? (
                <button onClick={handleStop} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded hover:bg-red-50 transition-colors">
                   <Square className="w-3.5 h-3.5 fill-current" /> Stop
                </button>
             ) : (
                <button onClick={handleStart} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 shadow-sm transition-all hover:shadow">
                   <Play className="w-3.5 h-3.5 fill-current" /> Start Agent
                </button>
             )}
          </div>
        </div>
      </nav>

      {/* --- Main Layout --- */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        
        {/* Settings Panel (Collapsible) */}
        {showSettings && (
           <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm animate-in slide-in-from-top-2">
              <div className="flex border-b border-gray-100">
                 <button onClick={() => setSettingsTab('general')} className={`px-5 py-3 text-sm font-medium ${settingsTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>General</button>
                 <button onClick={() => setSettingsTab('ai')} className={`px-5 py-3 text-sm font-medium ${settingsTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>AI Config</button>
                 <button onClick={() => setSettingsTab('notifications')} className={`px-5 py-3 text-sm font-medium ${settingsTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Notifications</button>
              </div>
              <div className="p-6 bg-gray-50/50">
                 {/* (Isi Settings sama seperti sebelumnya, disederhanakan visualnya) */}
                 {settingsTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Credentials</h4>
                          <Input label="API Key" type="password" value={config.apiKey} onChange={v => handleConfigChange('apiKey', v)} />
                          <Input label="API Secret" type="password" value={config.apiSecret} onChange={v => handleConfigChange('apiSecret', v)} />
                          <Input label="Passphrase" type="password" value={config.passphrase} onChange={v => handleConfigChange('passphrase', v)} />
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Risk Management</h4>
                          <Input label="Max Bet Size ($)" type="number" value={config.safetyLimits.maxBetSize} onChange={v => {
                              const newLimits = {...config.safetyLimits, maxBetSize: parseFloat(v)};
                              handleConfigChange('safetyLimits', newLimits);
                          }} />
                          <Input label="Max Daily Loss ($)" type="number" value={config.safetyLimits.maxDailyLoss} onChange={v => {
                               const newLimits = {...config.safetyLimits, maxDailyLoss: parseFloat(v)};
                               handleConfigChange('safetyLimits', newLimits);
                          }} />
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode</h4>
                           <div className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded">
                              <span className="text-sm font-medium">Simulation Mode</span>
                              <Toggle enabled={config.simulationMode} onChange={v => handleConfigChange('simulationMode', v)} />
                           </div>
                       </div>
                    </div>
                 )}
                 {settingsTab === 'ai' && (
                    <div className="space-y-4 max-w-xl">
                       <Input label="OpenRouter API Key" type="password" value={config.openrouterApiKey} onChange={v => handleConfigChange('openrouterApiKey', v)} />
                       <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Model</label>
                          <select className="w-full text-sm border-gray-200 rounded-md py-2" value={config.selectedModel} onChange={e => handleConfigChange('selectedModel', e.target.value)}>
                             {OPENROUTER_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                       </div>
                    </div>
                 )}
                 {/* Notification tab similar structure... */}
              </div>
           </div>
        )}

        {/* --- Metrics Overview (Portfolio Style) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <MetricCard label="Portfolio Value" value={`$${state.bankroll.toFixed(2)}`} icon={<Wallet className="w-4 h-4" />} />
           <MetricCard 
              label="Today's P&L" 
              value={`${state.todayPnL >= 0 ? '+' : ''}$${state.todayPnL.toFixed(2)}`} 
              highlight={state.todayPnL >= 0 ? 'green' : 'red'}
              icon={state.todayPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} 
           />
           <MetricCard label="Open Positions" value={state.positions.length.toString()} icon={<Activity className="w-4 h-4" />} />
           <MetricCard label="Opportunities" value={state.opportunities.length.toString()} icon={<Target className="w-4 h-4" />} />
        </div>

        {/* --- Main Content Tabs --- */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[600px]"> {/* Fixed Height Container */}
           
           {/* Tab Navigation */}
           <div className="flex items-center justify-between px-4 border-b border-gray-100 bg-white sticky top-0 z-10 rounded-t-lg">
              <div className="flex gap-6">
                 <TabButton active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} label="Opportunities" count={state.opportunities.length} />
                 <TabButton active={activeTab === 'positions'} onClick={() => setActiveTab('positions')} label="Positions" count={state.positions.length} />
                 <TabButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')} label="History" />
              </div>
              <div className="py-3">
                 <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Filter markets..." className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-500 outline-none w-48 transition-all" />
                 </div>
              </div>
           </div>

           {/* Scrollable Content Area */}
           <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
              {activeTab === 'opportunities' && <OpportunitiesTable data={state.opportunities} />}
              {activeTab === 'positions' && <PositionsTable data={state.positions} />}
              {activeTab === 'trades' && <TradesTable data={state.trades} />}
           </div>
        </div>

      </main>
    </div>
  );
}

// --- Sub-Components (Polymarket Style) ---

function MetricCard({ label, value, highlight, icon }: any) {
   const colorClass = highlight === 'green' ? 'text-emerald-600' : highlight === 'red' ? 'text-red-600' : 'text-gray-900';
   return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-24">
         <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            {icon && <span className="opacity-50">{icon}</span>}
         </div>
         <span className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</span>
      </div>
   );
}

function NavBadge({ active, label, color = 'blue' }: any) {
   if (!active) return null;
   const style = color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100';
   return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded ${style}`}>
         {label}
      </span>
   );
}

function TabButton({ active, onClick, label, count }: any) {
   return (
      <button 
         onClick={onClick} 
         className={`py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${active ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
         {label}
         {count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
               {count}
            </span>
         )}
      </button>
   );
}

function Input({ label, value, onChange, type = 'text' }: any) {
   return (
      <div>
         <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
         <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none transition-colors"
         />
      </div>
   );
}

function Toggle({ enabled, onChange }: any) {
   return (
      <button onClick={() => onChange(!enabled)} className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
         <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
   );
}

// --- Tables (Sticky Header & Clean Lines) ---

function OpportunitiesTable({ data }: { data: AgentState['opportunities'] }) {
   if (!data.length) return <EmptyState icon={Target} text="No opportunities detected yet" sub="Waiting for next scan..." />;

   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[40%]">Market</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Probability</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Prediction</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Edge</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((opp, i) => (
               <tr key={i} className="hover:bg-gray-50 group transition-colors">
                  <td className="py-3 px-4">
                     <div className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug">{opp.market.question}</div>
                     <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span>Liq: ${opp.market.liquidity.toLocaleString()}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="truncate max-w-[200px]">{opp.reasoning?.slice(0, 60)}...</span>
                     </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                     <div className="text-sm font-medium text-gray-700">{(opp.outcome.price * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                     <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${opp.recommendedBet === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {opp.recommendedBet}
                     </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                     <div className="text-sm font-bold text-blue-600">+{((opp.expectedValue) * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                     <button className="px-3 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-600 rounded hover:border-blue-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100">
                        View
                     </button>
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function PositionsTable({ data }: { data: AgentState['positions'] }) {
   if (!data.length) return <EmptyState icon={Activity} text="No active positions" sub="Trades will appear here" />;
   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-[40%]">Market</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Side</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Shares</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Avg Price</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">P&L</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((pos, i) => (
               <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                     <div className="font-medium text-gray-900 line-clamp-1 text-sm">{pos.marketQuestion}</div>
                     {pos.isSimulated && <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">SIM</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                     <span className="font-bold text-xs text-emerald-600">{pos.outcome}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-gray-600">{pos.shares.toFixed(1)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-gray-600">{(pos.avgPrice * 100).toFixed(1)}¢</td>
                  <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                     {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function TradesTable({ data }: { data: AgentState['trades'] }) {
   if (!data.length) return <EmptyState icon={RefreshCw} text="No trade history" sub="Start agent to generate trades" />;
   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Time</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-[40%]">Market</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Side</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Price</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Size</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Status</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((trade) => (
               <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-400 font-mono">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 text-sm line-clamp-1">{trade.marketQuestion}</td>
                  <td className="py-3 px-4 text-center">
                     <span className={`text-xs font-bold ${trade.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>{trade.side} {trade.outcome}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-gray-600">{(trade.price * 100).toFixed(1)}¢</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-gray-600">${trade.total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${trade.status === 'FILLED' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}`}>
                        {trade.status}
                     </span>
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function EmptyState({ icon: Icon, text, sub }: any) {
   return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
         <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <Icon className="w-6 h-6 text-gray-300" />
         </div>
         <p className="font-medium text-gray-500">{text}</p>
         <p className="text-sm">{sub}</p>
      </div>
   );
}