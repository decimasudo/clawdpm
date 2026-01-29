import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentState, AgentConfig, SafetyLimits } from '@/types/polymarket';
import { initializeAPI } from '@/lib/polymarket-api';
import { AutoExecutor } from '@/lib/auto-executor';
import { DEFAULT_SAFETY_LIMITS } from '@/lib/risk-manager';
import { initLLMAnalyzer, getLLMAnalyzer } from '@/lib/llm-analyzer';
import { initNotificationService, getNotificationService } from '@/lib/notification-service';
import {
  Square, Wallet, Activity, Target,
  RefreshCw, TrendingUp, TrendingDown, Clock, Github, HelpCircle, ArrowLeft
} from 'lucide-react';
import PixelBackground from './PixelBackground';

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
  const navigate = useNavigate();
  // Config state is kept for internal logic, even if UI is removed
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
  const [activeTab, setActiveTab] = useState<'opportunities' | 'positions' | 'trades'>('opportunities');

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

    const exec = new AutoExecutor({ ...config, simulationMode: true }, setState);
    exec.setBankroll(1000);
    setExecutor(exec);

    console.log("🚀 Dashboard mounted, auto-starting agent...");
    exec.start();

    return () => exec.stop();
  }, []);

  // Sync Config (Logic kept if you re-add settings later or load from LS)
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
    
    if (executor) {
        executor.updateConfig({ ...config, simulationMode: config.simulationMode });
    }
  }, [config, executor]);

  const handleStop = useCallback(() => {
    if (executor) executor.stop();
  }, [executor]);

  return (
    <div className="min-h-screen text-gray-900 font-sans selection:bg-blue-300 relative">
      <PixelBackground />
      
      {/* --- Header --- */}
      <nav className="sticky top-0 z-30 bg-white border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
               {/* 8-bit Logo - Animated like landing page */}
               <div className="w-12 h-12 border-2 border-black shadow-hard-sm bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.jpeg" 
                    alt="Logo" 
                    className="w-10 h-10 object-cover animate-pixel-float" 
                  />
               </div>
               
               {/* NEW NAME CLAWDPM */}
               <span className="text-xl md:text-2xl font-bold tracking-tight text-blue-700 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  clawd<span className="text-black">pm</span>
               </span>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-black">
                <span className={`flex items-center gap-2 px-3 py-2 bg-white border-2 border-black shadow-hard-sm ${state.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                   <div className={`w-2 h-2 ${state.isRunning ? 'bg-green-600' : 'bg-gray-400'} animate-pulse`}></div>
                   {state.isRunning ? 'ONLINE' : 'OFFLINE'}
                </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 mr-2">
                <a 
                    href="https://github.com/decimasudo/clawdpm" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 border-2 border-transparent hover:border-black hover:shadow-hard-sm hover:bg-gray-100 transition-none"
                >
                    <Github className="w-5 h-5" />
                </a>
             </div>
             
             {/* How It Works Button (Replaces Settings) */}
             <button 
                onClick={() => navigate('/how-it-works')}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-hard-sm text-xs font-bold uppercase hover:translate-y-1 hover:shadow-none transition-none"
             >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden md:inline">How It Works</span>
             </button>

             {state.isRunning && (
                <button onClick={handleStop} className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-black shadow-hard-sm text-red-600 text-xs font-bold hover:translate-y-1 hover:shadow-none transition-none">
                   <Square className="w-3 h-3 fill-current" /> STOP
                </button>
             )}
          </div>
        </div>
      </nav>

      {/* --- Main Layout --- */}
      <main className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* --- Metrics Overview --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
           <MetricCard label="BANKROLL" value={`$${state.bankroll.toFixed(0)}`} icon={<Wallet className="w-5 h-5" />} />
           <MetricCard 
              label="TODAY P&L" 
              value={`${state.todayPnL >= 0 ? '+' : ''}$${state.todayPnL.toFixed(2)}`} 
              highlight={state.todayPnL >= 0 ? 'green' : 'red'}
              icon={state.todayPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} 
           />
           <MetricCard label="ACTIVE POS" value={state.positions.length.toString()} icon={<Activity className="w-5 h-5" />} />
           <MetricCard label="TARGETS" value={state.opportunities.length.toString()} icon={<Target className="w-5 h-5" />} />
        </div>

        {/* --- Main Content Tabs --- */}
        <div className="bg-white border-4 border-black shadow-hard flex flex-col h-[650px]">
           
           {/* Tab Navigation */}
           <div className="flex items-center justify-between border-b-4 border-black bg-gray-100">
              <div className="flex overflow-x-auto no-scrollbar w-full md:w-auto">
                 <TabButton active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} label="OPPORTUNITIES" count={state.opportunities.length} />
                 <TabButton active={activeTab === 'positions'} onClick={() => setActiveTab('positions')} label="POSITIONS" count={state.positions.length} />
                 <TabButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')} label="LOGS" />
              </div>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto bg-white custom-scrollbar p-2">
              {activeTab === 'opportunities' && <OpportunitiesTable data={state.opportunities} />}
              {activeTab === 'positions' && <PositionsTable data={state.positions} />}
              {activeTab === 'trades' && <TradesTable data={state.trades} />}
           </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex items-center justify-center text-[10px] text-gray-500 gap-2 uppercase font-bold">
            <Clock className="w-3 h-3" />
            <span>Updated: {state.lastScanTime ? state.lastScanTime.toLocaleTimeString() : 'WAITING...'}</span>
        </div>

      </main>
    </div>
  );
}

// --- Sub-Components ---

function MetricCard({ label, value, highlight, icon }: any) {
   const colorClass = highlight === 'green' ? 'text-green-600' : highlight === 'red' ? 'text-red-600' : 'text-black';
   return (
      <div className="bg-white p-4 border-2 border-black shadow-hard flex flex-col justify-between h-28">
         <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase">{label}</span>
            {icon && <span className="text-black">{icon}</span>}
         </div>
         <span className={`text-xl md:text-2xl font-bold tracking-tighter ${colorClass}`}>{value}</span>
      </div>
   );
}

function TabButton({ active, onClick, label, count }: any) {
   return (
      <button 
         onClick={onClick} 
         className={`py-4 px-6 text-[10px] md:text-xs font-bold transition-none flex items-center gap-3 whitespace-nowrap border-r-2 border-black ${active ? 'bg-white text-black translate-y-1' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
      >
         {label}
         {count !== undefined && (
            <span className={`px-2 py-1 text-[8px] border border-black ${active ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
               {count}
            </span>
         )}
      </button>
   );
}

// --- Tables ---

function OpportunitiesTable({ data }: { data: AgentState['opportunities'] }) {
   if (!data.length) return <EmptyState icon={Target} text="SCANNING..." sub="WAITING FOR SIGNAL" />;

   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-100 border-b-2 border-black sticky top-0 z-10">
            <tr>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase w-[40%]">Market</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-right">Prob</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-center">Pick</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-right">Edge</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-right hidden md:table-cell">Act</th>
            </tr>
         </thead>
         <tbody className="divide-y-2 divide-gray-100">
            {data.map((opp, i) => (
               <tr key={i} className="hover:bg-blue-50 group">
                  <td className="py-4 px-4">
                     <div className="font-bold text-black text-[10px] md:text-xs leading-relaxed">{opp.market.question}</div>
                     <div className="text-[8px] text-gray-500 mt-2 font-mono uppercase">
                        LIQ: ${opp.market.liquidity.toLocaleString()}
                     </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                     <div className="text-xs font-bold text-black">{(opp.outcome.price * 100).toFixed(0)}%</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                     <span className={`inline-block px-2 py-1 text-[8px] border-2 border-black shadow-hard-sm font-bold ${opp.recommendedBet === 'YES' ? 'bg-green-400 text-black' : 'bg-red-400 text-black'}`}>
                        {opp.recommendedBet}
                     </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                     <div className="text-xs font-bold text-blue-600">+{((opp.expectedValue) * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-4 px-4 text-right hidden md:table-cell">
                     <button className="px-4 py-2 bg-white border-2 border-black text-[8px] font-bold hover:bg-black hover:text-white transition-none shadow-hard-sm active:shadow-none active:translate-y-1">
                        VIEW
                     </button>
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function PositionsTable({ data }: { data: AgentState['positions'] }) {
   if (!data.length) return <EmptyState icon={Activity} text="NO POSITIONS" sub="TRADES APPEAR HERE" />;
   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-100 border-b-2 border-black sticky top-0 z-10">
            <tr>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase">Market</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-center">Side</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-right">P&L</th>
            </tr>
         </thead>
         <tbody className="divide-y-2 divide-gray-100">
            {data.map((pos, i) => (
               <tr key={i} className="hover:bg-blue-50">
                  <td className="py-4 px-4">
                     <div className="font-bold text-black text-[10px] line-clamp-2">{pos.marketQuestion}</div>
                     {pos.isSimulated && <span className="text-[8px] text-orange-600 bg-orange-100 px-1 border border-orange-200 mt-1 inline-block">SIM</span>}
                  </td>
                  <td className="py-4 px-4 text-center">
                     <span className="font-bold text-[10px] text-green-700">{pos.outcome}</span>
                  </td>
                  <td className={`py-4 px-4 text-right text-[10px] font-bold ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}

function TradesTable({ data }: { data: AgentState['trades'] }) {
   if (!data.length) return <EmptyState icon={RefreshCw} text="NO HISTORY" sub="EMPTY LOG" />;
   return (
      <table className="w-full text-left border-collapse">
         <thead className="bg-gray-100 border-b-2 border-black sticky top-0 z-10">
            <tr>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase w-[40%]">Market</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-center">Side</th>
               <th className="py-4 px-4 text-[10px] font-bold text-gray-600 uppercase text-right">Status</th>
            </tr>
         </thead>
         <tbody className="divide-y-2 divide-gray-100">
            {data.map((trade) => (
               <tr key={trade.id} className="hover:bg-blue-50">
                  <td className="py-4 px-4 font-bold text-black text-[10px] line-clamp-1">{trade.marketQuestion}</td>
                  <td className="py-4 px-4 text-center">
                     <span className={`text-[10px] font-bold ${trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{trade.side} {trade.outcome}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                     <span className={`text-[8px] uppercase font-bold px-2 py-1 border border-black shadow-[1px_1px_0_#000] ${trade.status === 'FILLED' ? 'bg-gray-100' : 'bg-red-100'}`}>
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
         <div className="w-16 h-16 bg-white border-2 border-black shadow-hard mb-4 flex items-center justify-center">
            <Icon className="w-8 h-8 text-black" />
         </div>
         <p className="font-bold text-black text-xs uppercase">{text}</p>
         <p className="text-[10px] font-mono mt-1">{sub}</p>
      </div>
   );
}