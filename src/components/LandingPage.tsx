import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  Brain, 
  Shield, 
  Cpu, 
  Activity 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-blue-300">
      
      {/* --- Navigation --- */}
      <nav className="border-b-4 border-black sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* 8-bit Logo */}
            <img src="/logo.jpeg" alt="Logo" className="w-10 h-10 border-2 border-black shadow-hard-sm" />
            <span className="text-xl font-bold tracking-tight uppercase">clawd<span className="text-black">pm</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-600 uppercase">
            <a href="#features" className="hover:text-blue-700 hover:underline decoration-2 underline-offset-4">Features</a>
            <a href="#how-it-works" className="hover:text-blue-700 hover:underline decoration-2 underline-offset-4">How it Works</a>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-black text-white text-[10px] font-bold uppercase shadow-hard hover:translate-y-1 hover:shadow-none transition-none border-2 border-transparent hover:border-black"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-blue-50 border-b-4 border-black">
        {/* Pixel Pattern Background */}
        <div className="absolute inset-0 -z-10 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-black mb-8 max-w-4xl mx-auto leading-normal uppercase drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">
            Clawdpm  for <br/>
            <span className="text-blue-700 bg-white px-2 border-2 border-black shadow-hard-sm inline-block transform -rotate-1 mt-2">Polymarket</span>
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 mb-12 max-w-2xl mx-auto leading-loose font-mono">
            An agent inspired by Claude, trained for Polymarket built to find your edge.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="group px-8 py-4 bg-blue-600 text-white text-sm font-bold uppercase border-4 border-black shadow-hard hover:translate-y-1 hover:shadow-none transition-none flex items-center gap-3"
            >
              Start Trading
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-black text-sm font-bold uppercase border-4 border-black shadow-hard hover:translate-y-1 hover:shadow-none transition-none">
              View Platform
            </a>
          </div>
        </div>
      </section>

      {/* --- Feature Grid --- */}
      <section id="features" className="py-24 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-black uppercase mb-4 decoration-4 underline underline-offset-8 decoration-blue-500">Institutional Features</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-xs font-mono mt-6">BUILT FOR SERIOUS TRADERS.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="w-8 h-8 text-black" />}
              title="LLM Analysis"
              desc="Uses Gemini to read markets and calculate real odds."
            />
            <FeatureCard 
              icon={<Cpu className="w-8 h-8 text-blue-700" />}
              title="Auto Execution"
              desc="Set parameters. Scan. Filter. Trade. Automatically."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-green-700" />}
              title="Risk Mgmt"
              desc="Kelly Criterion sizing & bankroll protection built-in."
            />
          </div>
        </div>
      </section>

      {/* --- How it Works --- */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-12">
              <h2 className="text-2xl font-bold text-black uppercase">How It Works</h2>
              <Step number="01" title="CONNECT API" desc="Input Proxy API keys. Stored locally." />
              <Step number="02" title="CONFIGURE AI" desc="Select LLM model (Gemini 2.0 Flash)." />
              <Step number="03" title="START AGENT" desc="Watch the agent scan & trade live." />
            </div>
            
            {/* 8-bit Visual */}
            <div className="flex-1">
               <div className="bg-white border-4 border-black shadow-hard p-6 transform rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
                     <div className="flex gap-2">
                        <div className="w-4 h-4 border-2 border-black bg-white"></div>
                        <div className="w-4 h-4 border-2 border-black bg-gray-400"></div>
                     </div>
                     <div className="text-[10px] font-bold text-black uppercase">Live Feed</div>
                  </div>
                  <div className="space-y-4 font-mono text-[10px]">
                     <div className="bg-blue-50 border-2 border-black p-4 flex items-center justify-between shadow-hard-sm">
                        <span>&gt; MARKET_SCAN_COMPLETE</span>
                        <span className="bg-green-400 text-black px-2 border border-black font-bold">BUY YES</span>
                     </div>
                     <div className="bg-gray-50 border-2 border-gray-300 p-4 flex items-center justify-between">
                         <span>&gt; ANALYZING_PROBS...</span>
                        <span className="bg-gray-200 text-gray-500 px-2 border border-gray-400 font-bold">SKIP</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-12 bg-white border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-black text-xs font-bold uppercase">
          <p>© 2026 clawdpm. Open Source.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
             <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> System Ready</span>
             <a href="#" className="hover:underline">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-8 bg-white border-4 border-black shadow-hard hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] transition-all">
      <div className="mb-6">{icon}</div>
      <h3 className="text-sm font-bold text-black mb-3 uppercase">{title}</h3>
      <p className="text-gray-600 text-xs leading-relaxed font-mono">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: any) {
   return (
      <div className="flex gap-6 items-start">
         <span className="text-3xl font-black text-gray-300 font-sans">{number}</span>
         <div>
            <h4 className="text-sm font-bold text-black mb-1 uppercase">{title}</h4>
            <p className="text-gray-600 text-xs font-mono">{desc}</p>
         </div>
      </div>
   );
}