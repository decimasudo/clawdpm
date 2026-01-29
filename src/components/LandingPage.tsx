import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  BarChart3, 
  Brain, 
  Shield, 
  Cpu, 
  Activity 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* --- Navigation --- */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight">Polymarket<span className="text-blue-600">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it Works</a>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f0f9ff_1px,transparent_1px),linear-gradient(to_bottom,#f0f9ff_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
            The AI Edge for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Prediction Markets</span>
          </h1>
          
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
            Automate your betting strategy with LLM-powered analysis. 
            Detect mispriced markets, manage risk, and execute trades 24/7.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <button 
              onClick={() => navigate('/dashboard')}
              className="group px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
            >
              Start Trading Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-slate-700 font-bold rounded-full border border-slate-200 hover:bg-slate-50 transition-all">
              View Polymarket
            </a>
          </div>
        </div>
      </section>

      {/* --- Feature Grid --- */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Institutional-Grade Features</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Built for serious traders who want to leverage AI for data-driven decision making.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="w-8 h-8 text-indigo-600" />}
              title="LLM Market Analysis"
              desc="Uses Gemini/OpenAI to read market questions, analyze real-world probabilities, and detect +EV opportunities."
            />
            <FeatureCard 
              icon={<Cpu className="w-8 h-8 text-blue-600" />}
              title="Automated Execution"
              desc="Set your parameters and let the bot scan, filter, and execute trades on Polymarket automatically."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-emerald-600" />}
              title="Risk Management"
              desc="Built-in Kelly Criterion sizing, stop-loss limits, and bankroll protection to keep your capital safe."
            />
          </div>
        </div>
      </section>

      {/* --- How it Works (Steps) --- */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
              <Step number="01" title="Connect API" desc="Securely input your Polymarket Proxy API keys. Keys are stored locally in your browser." />
              <Step number="02" title="Configure AI" desc="Select your preferred LLM model (Gemini 2.0 Flash recommended) for market analysis." />
              <Step number="03" title="Start Agent" desc="Watch as the agent scans live markets, calculates odds, and executes trades." />
            </div>
            
            {/* Visual Representation of Dashboard */}
            <div className="flex-1 relative">
               <div className="absolute inset-0 bg-blue-600 blur-[80px] opacity-20 rounded-full"></div>
               <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                     <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                     </div>
                     <div className="text-xs font-mono text-slate-400">Live Feed</div>
                  </div>
                  <div className="space-y-4">
                     <div className="h-20 bg-slate-50 rounded-lg border border-slate-100 p-4 flex items-center justify-between">
                        <div className="space-y-2">
                           <div className="w-48 h-2 bg-slate-200 rounded"></div>
                           <div className="w-32 h-2 bg-slate-200 rounded"></div>
                        </div>
                        <div className="w-16 h-8 bg-blue-100 rounded text-blue-600 flex items-center justify-center text-xs font-bold">BUY YES</div>
                     </div>
                     <div className="h-20 bg-slate-50 rounded-lg border border-slate-100 p-4 flex items-center justify-between opacity-60">
                         <div className="space-y-2">
                           <div className="w-40 h-2 bg-slate-200 rounded"></div>
                           <div className="w-24 h-2 bg-slate-200 rounded"></div>
                        </div>
                        <div className="w-16 h-8 bg-red-50 rounded text-red-400 flex items-center justify-center text-xs font-bold">SKIP</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
          <p>© 2026 PolymarketAI Agent. Open Source Project.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
             <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> System Operational</span>
             <a href="#" className="hover:text-slate-900">GitHub</a>
             <a href="#" className="hover:text-slate-900">Docs</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group">
      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm w-fit group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: any) {
   return (
      <div className="flex gap-6">
         <span className="text-4xl font-black text-slate-200">{number}</span>
         <div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
            <p className="text-slate-500">{desc}</p>
         </div>
      </div>
   );
}