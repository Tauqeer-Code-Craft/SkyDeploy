import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/UI';
import { Cloud, Zap, Shield, GitBranch, TerminalSquare, RefreshCw, Cpu, Activity } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-black select-none font-sans">
      {/* Hero */}
      <section className="relative pt-40 pb-28 overflow-hidden flex flex-col items-center justify-center">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2 text-sm text-blue-200 backdrop-blur-xl mb-12 shadow-[0_0_20px_rgba(59,130,246,0.15)] group transition-all hover:bg-blue-500/20 cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-3 animate-pulse shadow-[0_0_10px_rgba(96,165,250,1)]"></span>
            SkyDeploy v3.7.12 is Live: Introducing Auto-Healing & AI Diagnostics 🚀
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-8 leading-[1.1]">
            Code to Cloud.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-lg">
              In Few Minutes.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-14 leading-relaxed font-light">
            The next-generation autonomous PaaS. Push your repository, upload a ZIP, or simply describe what you want with our AI Dev Mode. SkyDeploy builds, secures, and maps everything dynamically.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register">
              <Button className="h-14 px-10 text-lg font-semibold rounded-xl bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:bg-zinc-100 transition-all transform hover:scale-105 active:scale-95 duration-300">
                Start Deploying For Free
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="secondary" className="h-14 px-10 text-lg font-semibold rounded-xl border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/80 backdrop-blur-md transition-all">
                Read Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid of Advanced Features */}
      <section className="py-24 relative z-10 border-t border-zinc-800/30 bg-zinc-950/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Enterprise-grade capabilities. Local execution.</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">We ripped the limits off traditional serverless architectures and built an ecosystem where your code actually breathes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-yellow-400" />}
              title="Sub-Second Routing"
              description="Automated Caddy reverse-proxy mapping assigns ports and domains natively without manual NGINX config headaches."
            />
            <FeatureCard 
              icon={<Cpu className="h-6 w-6 text-purple-400" />}
              title="AI Prompt-to-Deploy"
              description="Type a text prompt. Our integrated Multi-LLM engine writes the code, scaffolds the container, and deploys it live in seconds."
            />
            <FeatureCard 
              icon={<Shield className="h-6 w-6 text-green-400" />}
              title="Military-Grade Boxing"
              description="Security first. Every container drops all Linux capabilities, runs in unprivileged namespaces, and strictly limits PIDs."
            />
            <FeatureCard 
              icon={<RefreshCw className="h-6 w-6 text-blue-400" />}
              title="Autonomous Auto-Healing"
              description="Crash loops are detected automatically. The engine restarts failures using exponential backoff to keep the grid stable."
            />
            <FeatureCard 
              icon={<Activity className="h-6 w-6 text-red-400" />}
              title="AI Debugging Engine"
              description="When apps crash, SkyDeploy intercepts the logs and feeds them into a local Phi-3 context to analyze the exact failure semantics."
            />
            <FeatureCard 
              icon={<TerminalSquare className="h-6 w-6 text-orange-400" />}
              title="No Execution Limits"
              description="Unlike serverless, you can run daemons, long-polling websockets, and background scrapers limitlessly."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900 bg-black mt-auto relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-zinc-500 text-sm">
          <div className="flex items-center gap-2 mb-6 md:mb-0">
            <Cloud className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg tracking-tight text-white">SkyDeploy</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium">
            <Link to="/docs" className="hover:text-blue-400 transition-colors">Documentation</Link>
            <a href="#" className="hover:text-blue-400 transition-colors">GitHub Repository</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Research Paper</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="group relative flex flex-col items-start p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm overflow-hidden hover:border-zinc-600 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:-translate-y-1">
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div className="p-3 rounded-xl bg-black/50 border border-zinc-800/80 mb-6 shadow-inner">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-zinc-100 mb-3 tracking-tight">{title}</h3>
    <p className="text-zinc-400 leading-relaxed font-light text-sm">{description}</p>
  </div>
);

export default Landing;
