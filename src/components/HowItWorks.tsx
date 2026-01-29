import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Shield, Zap, Terminal } from 'lucide-react';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blue-50 text-gray-900 font-sans selection:bg-blue-300 pb-20">
      
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-white border-b-4 border-black">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-4">
               <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-2 border-2 border-black shadow-hard-sm hover:translate-y-1 hover:shadow-none transition-none bg-white"
               >
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <span className="text-lg font-bold uppercase tracking-tight">System Manual</span>
           </div>
           
           <div className="text-[10px] font-bold uppercase bg-black text-white px-3 py-1">
              v1.0.0
           </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
         
         <div className="bg-white border-4 border-black shadow-hard p-8 mb-12">
            <h1 className="text-2xl md:text-4xl font-black uppercase mb-6 text-blue-700 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
               Welcome to <span className="text-black">clawdpm</span>
            </h1>
            <p className="text-xs md:text-sm font-mono leading-relaxed text-gray-600 mb-6">
               &gt; SYSTEM_INIT...<br/>
               &gt; LOAD_MODULE: PREDICTION_MARKET_AGENT<br/>
               &gt; STATUS: READY<br/><br/>
               ClawdPM is an autonomous trading agent designed for Polymarket. It utilizes Large Language Models (LLMs) to analyze market questions, estimate probabilities, and execute trades when a positive Expected Value (+EV) is detected.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <InfoCard 
               icon={<Zap className="w-6 h-6" />}
               title="1. Market Scanning"
               desc="The agent continuously scans the Polymarket CLOB (Central Limit Order Book) for active markets with high liquidity."
            />
            <InfoCard 
               icon={<Cpu className="w-6 h-6" />}
               title="2. AI Analysis"
               desc="Market data is fed into Gemini 2.0 Flash. The AI reads the question, researches real-world data, and outputs a probability score."
            />
            <InfoCard 
               icon={<Terminal className="w-6 h-6" />}
               title="3. Strategy Engine"
               desc="The system calculates Kelly Criterion bet sizing. If the Edge > 10%, it prepares an order."
            />
            <InfoCard 
               icon={<Shield className="w-6 h-6" />}
               title="4. Execution"
               desc="Orders are routed through a proxy server to sign transactions securely without exposing keys."
            />
         </div>

         <div className="bg-black text-white p-8 border-4 border-gray-800 shadow-hard">
            <h3 className="text-lg font-bold uppercase mb-4 text-green-400">Configuration Guide</h3>
            <ul className="space-y-4 text-xs font-mono">
               <li className="flex gap-4">
                  <span className="text-gray-500">[01]</span>
                  <span>Set your Polymarket Proxy API Keys in the environment variables or build config.</span>
               </li>
               <li className="flex gap-4">
                  <span className="text-gray-500">[02]</span>
                  <span>Ensure you have USDC (Polygon) in your proxy wallet for trading.</span>
               </li>
               <li className="flex gap-4">
                  <span className="text-gray-500">[03]</span>
                  <span>Adjust Risk Limits to protect your bankroll (Max Daily Loss).</span>
               </li>
            </ul>
         </div>

      </main>
    </div>
  );
}

function InfoCard({ icon, title, desc }: any) {
   return (
      <div className="bg-white border-2 border-black p-6 shadow-hard-sm hover:-translate-y-1 hover:shadow-hard transition-none">
         <div className="w-12 h-12 bg-blue-50 border-2 border-black flex items-center justify-center mb-4">
            {icon}
         </div>
         <h3 className="font-bold text-sm uppercase mb-2">{title}</h3>
         <p className="text-xs text-gray-600 font-mono leading-relaxed">{desc}</p>
      </div>
   );
}