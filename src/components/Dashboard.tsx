import { useState, useEffect, useCallback } from 'react';
import type { AgentState, AgentConfig, SafetyLimits } from '@/types/polymarket';
import { initializeAPI } from '@/lib/polymarket-api';
import { AutoExecutor } from '@/lib/auto-executor';
import { DEFAULT_SAFETY_LIMITS } from '@/lib/risk-manager';
import { initLLMAnalyzer, getLLMAnalyzer, OPENROUTER_MODELS } from '@/lib/llm-analyzer';
import { initNotificationService, getNotificationService } from '@/lib/notification-service';
import {
  Square, Settings, Wallet, Activity, Target, Shield,
  RefreshCw, Bell, Brain, Send, CheckCircle, XCircle, Zap,
  TrendingUp, TrendingDown, Clock, Search, Github
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

  // Init System & Auto Start
  useEffect(() => {
    initializeAPI(config.apiKey, config.apiSecret, config.passphrase);
    initLLMAnalyzer(config.openrouterApiKey, 'openrouter', config.selectedModel);
    initNotificationService({
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      discordWebhookUrl: config.discordWebhookUrl,
      enabled: config.notificationsEnabled,
    });

    // Create Executor
    const exec = new AutoExecutor({ ...config, simulationMode: true }, setState);
    exec.setBankroll(1000);
    setExecutor(exec);

    // ⚡ AUTO START: Langsung jalankan scanning saat dashboard dibuka
    console.log("🚀 Dashboard mounted, auto-starting agent...");
    exec.start();

    // Cleanup saat user meninggalkan halaman
    return () => exec.stop();
  }, []); // Run once on mount

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
    
    // Update executor config on the fly
    if (executor) {
        executor.updateConfig({ ...config, simulationMode: config.simulationMode });
    }
  }, [config, executor]); // Dependencies updated

  const handleStop = useCallback(() => {
    if (executor) executor.stop();
  }, [executor]);

  const handleConfigChange = (key: keyof ExtendedConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-gray-900 font-sans selection:bg-blue-100">
      
      {/* --- Header --- */}
      <nav className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
               </div>
               <span className="text-lg font-bold tracking-tight">Polymarket<span className="text-blue-600">AI</span></span>
            </div>
            
            {/* Status Indicator (Mobile & Desktop) */}
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                   <div className={`w-1.5 h-1.5 rounded-full ${state.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                   {state.isRunning ? 'Live' : 'Stopped'}
                </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Social Links */}
             <div className="hidden md:flex items-center gap-1 mr-2">
                <a 
                    href="https://github.com/decimasudo/clawdpm" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <Github className="w-5 h-5" />
                </a>
                <a 
                    href="#" // Placeholder X link
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                >
                    {/* Custom X Logo SVG */}
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                </a>
             </div>
             
             <div className="h-4 w-px bg-gray-200 hidden md:block"></div>

             <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded hover:bg-gray-100 text-gray-500 transition-colors ${showSettings ? 'bg-gray-100 text-gray-900' : ''}`}
             >
                <Settings className="w-5 h-5" />
             </button>

             {/* Tombol Stop hanya muncul jika user ingin menghentikan manual */}
             {state.isRunning && (
                <button onClick={handleStop} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded hover:bg-red-50 transition-colors">
                   <Square className="w-3 h-3 fill-current" /> Stop
                </button>
             )}
          </div>
        </div>
      </nav>

      {/* --- Main Layout --- */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        
        {/* Settings Panel */}
        {showSettings && (
           <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm animate-in slide-in-from-top-2">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                 <button onClick={() => setSettingsTab('general')} className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${settingsTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>General</button>
                 <button onClick={() => setSettingsTab('ai')} className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${settingsTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>AI Config</button>
                 <button onClick={() => setSettingsTab('notifications')} className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${settingsTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Notifications</button>
              </div>
              <div className="p-6 bg-gray-50/50">
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
                 {settingsTab === 'notifications' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <span className="text-sm font-medium">Enable Notifications</span>
                        <Toggle enabled={config.notificationsEnabled} onChange={(v) => handleConfigChange('notificationsEnabled', v)} />
                      </div>
                      <Input label="Telegram Bot Token" type="password" value={config.telegramBotToken} onChange={v => handleConfigChange('telegramBotToken', v)} />
                      <Input label="Telegram Chat ID" value={config.telegramChatId} onChange={v => handleConfigChange('telegramChatId', v)} />
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* --- Metrics Overview --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <MetricCard label="Portfolio" value={`$${state.bankroll.toFixed(2)}`} icon={<Wallet className="w-4 h-4" />} />
           <MetricCard 
              label="Today's P&L" 
              value={`${state.todayPnL >= 0 ? '+' : ''}$${state.todayPnL.toFixed(2)}`} 
              highlight={state.todayPnL >= 0 ? 'green' : 'red'}
              icon={state.todayPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} 
           />
           <MetricCard label="Active" value={state.positions.length.toString()} icon={<Activity className="w-4 h-4" />} />
           <MetricCard label="Found" value={state.opportunities.length.toString()} icon={<Target className="w-4 h-4" />} />
        </div>

        {/* --- Main Content Tabs --- */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[600px]">
           
           {/* Tab Navigation (Scrollable on Mobile) */}
           <div className="flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 rounded-t-lg">
              {/* Mobile Friendly Tab Container */}
              <div className="flex overflow-x-auto no-scrollbar w-full md:w-auto px-4">
                 <TabButton active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} label="Opportunities" count={state.opportunities.length} />
                 <TabButton active={activeTab === 'positions'} onClick={() => setActiveTab('positions')} label="Positions" count={state.positions.length} />
                 <TabButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')} label="History" />
              </div>
              
              <div className="hidden md:block pr-4 py-3">
                 <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Filter..." className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-500 outline-none w-32 transition-all" />
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

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-center text-xs text-gray-400 gap-2">
            <Clock className="w-3 h-3" />
            Last Update: {state.lastScanTime ? state.lastScanTime.toLocaleTimeString() : 'Scanning...'}
        </div>

      </main>
    </div>
  );
}

// --- Sub-Components ---

function MetricCard({ label, value, highlight, icon }: any) {
   const colorClass = highlight === 'green' ? 'text-emerald-600' : highlight === 'red' ? 'text-red-600' : 'text-gray-900';
   return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-20 md:h-24">
         <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide">{label}</span>
            {icon && <span className="opacity-50 scale-75 md:scale-100">{icon}</span>}
         </div>
         <span className={`text-lg md:text-2xl font-bold tracking-tight ${colorClass}`}>{value}</span>
      </div>
   );
}

function TabButton({ active, onClick, label, count }: any) {
   return (
      <button 
         onClick={onClick} 
         className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${active ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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

// --- Tables ---

function OpportunitiesTable({ data }: { data: AgentState['opportunities'] }) {
   if (!data.length) return <EmptyState icon={Target} text="Scanning markets..." sub="Please wait for AI analysis" />;

   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[40%]">Market</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Prob</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Pred</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Edge</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right hidden md:table-cell">Action</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((opp, i) => (
               <tr key={i} className="hover:bg-gray-50 group transition-colors">
                  <td className="py-3 px-4">
                     <div className="font-medium text-gray-900 line-clamp-2 text-xs md:text-sm leading-snug">{opp.market.question}</div>
                     <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                        <span>Liq: ${opp.market.liquidity.toLocaleString()}</span>
                        <span className="hidden md:inline w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="hidden md:inline truncate max-w-[200px]">{opp.reasoning?.slice(0, 60)}...</span>
                     </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                     <div className="text-xs md:text-sm font-medium text-gray-700">{(opp.outcome.price * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                     <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold ${opp.recommendedBet === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {opp.recommendedBet}
                     </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                     <div className="text-xs md:text-sm font-bold text-blue-600">+{((opp.expectedValue) * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">
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
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right hidden md:table-cell">Avg</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">P&L</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((pos, i) => (
               <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                     <div className="font-medium text-gray-900 line-clamp-1 text-xs md:text-sm">{pos.marketQuestion}</div>
                     {pos.isSimulated && <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">SIM</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                     <span className="font-bold text-xs text-emerald-600">{pos.outcome}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs md:text-sm font-mono text-gray-600">{pos.shares.toFixed(1)}</td>
                  <td className="py-3 px-4 text-right text-xs md:text-sm font-mono text-gray-600 hidden md:table-cell">{(pos.avgPrice * 100).toFixed(1)}¢</td>
                  <td className={`py-3 px-4 text-right text-xs md:text-sm font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                     {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function TradesTable({ data }: { data: AgentState['trades'] }) {
   if (!data.length) return <EmptyState icon={RefreshCw} text="No trade history" sub="Recent activity will show here" />;
   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Time</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-[40%]">Market</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Side</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right hidden md:table-cell">Price</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Size</th>
               <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Status</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.map((trade) => (
               <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-400 font-mono hidden md:table-cell">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 text-xs md:text-sm line-clamp-1">{trade.marketQuestion}</td>
                  <td className="py-3 px-4 text-center">
                     <span className={`text-xs font-bold ${trade.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>{trade.side} {trade.outcome}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs md:text-sm font-mono text-gray-600 hidden md:table-cell">{(trade.price * 100).toFixed(1)}¢</td>
                  <td className="py-3 px-4 text-right text-xs md:text-sm font-mono text-gray-600">${trade.total.toFixed(2)}</td>
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