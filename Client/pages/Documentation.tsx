import React from 'react';
import { BookOpen, Terminal, Shield, Zap, GitBranch } from 'lucide-react';

const Documentation: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans pb-20">
      <div className="container mx-auto px-4 pt-10">
        
        {/* Header */}
        <div className="mb-16 pb-8 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">SkyDeploy Documentation</h1>
          </div>
          <p className="text-xl text-zinc-400 font-light max-w-3xl">
            Everything you need to know about the self-hosted zero-config Platform as a Service that scales dynamically on your local network or VPS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* Sidemenu */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-2 border-r border-zinc-800/50 pr-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Getting Started</h3>
              <a href="#introduction" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors">Introduction</a>
              <a href="#quick-start" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors">Quick Start</a>
              
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 mt-8">Features</h3>
              <a href="#deployments" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors">Deployments (ZIP & Git)</a>
              <a href="#ai-mode" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors text-blue-400 font-medium">AI Dev Mode</a>
              <a href="#security" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors">Security Sandbox</a>
              <a href="#auto-healing" className="block p-2 rounded-lg hover:bg-zinc-900 transition-colors">Auto-Healing & Debugs</a>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-16">
            
            {/* Section 1 */}
            <section id="introduction">
              <h2 className="text-3xl font-bold text-white mb-6">Introduction</h2>
              <p className="mb-4 leading-relaxed">
                SkyDeploy is a developer-first mini PaaS that simplifies launching applications into isolated Docker environments. Built as a direct counter-thesis to highly restrictive web-based serverless environments, SkyDeploy gives you complete sandbox freedom. You can run permanent background tasks, execute Python scripts forever, or utilize native GPUs without arbitrary timeouts.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 flex items-start gap-4">
                <Zap className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-lg font-bold text-blue-200 mb-1">Why SkyDeploy?</h4>
                  <p className="text-blue-100/70 text-sm">Typical Platform-as-a-Service tools limit you to 15 seconds of execution and restrict filesystem access. SkyDeploy uses dynamic Docker routing so your code behaves perfectly identically to how it does on your local machine.</p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section id="quick-start">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Terminal className="h-7 w-7 text-zinc-400" />
                Quick Start
              </h2>
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs font-mono text-zinc-500">PowerShell</div>
                <div className="p-4 font-mono text-sm text-zinc-300">
                  <span className="text-purple-400"># 1. Install Dependencies & Build Base Images</span><br/>
                  .\install.ps1<br/><br/>
                  <span className="text-purple-400"># 2. Start the PaaS (Web UI & API Server)</span><br/>
                  .\start.ps1
                </div>
              </div>
              <p className="mt-4 text-zinc-400 text-sm">Once started, open `http://localhost:5173` to access the Dashboard. Caddy reverse proxy will automatically begin routing your domain subdomains or local loopbacks dynamically.</p>
            </section>

            {/* Section 3 */}
            <section id="ai-mode">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 flex items-center gap-3">
                <Zap className="h-7 w-7 text-purple-400" />
                Autonomous AI Dev Mode
              </h2>
              <p className="mb-4 leading-relaxed">
                SkyDeploy natively integrates with <span className="font-bold text-white">Local Large Language Models (LLMs)</span> via Ollama (Phi-3) or Cloud Models (Gemini/Claude). 
              </p>
              <p className="mb-6 leading-relaxed">
                By entering a single descriptive prompt in the Dashboard, the AI engine will autonomously scaffold a complete React application, resolve necessary AST imports, validate security safety, write it to disk, and deploy a container routed immediately to you. All within 10 seconds.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <h4 className="font-bold text-white mb-2">Prompt Input</h4>
                  <p className="text-sm text-zinc-400">"Build a real-time cryptocurrency dashboard with a dark neon interface."</p>
                </div>
                <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <h4 className="font-bold text-white mb-2">Output</h4>
                  <p className="text-sm text-zinc-400">A fully functioning container mapped to <code className="bg-black px-1 rounded text-green-400">http://crypto-app.127.0.0.1.nip.io:8080</code></p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="auto-healing">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Shield className="h-7 w-7 text-red-400" />
                AI Diagnostics & Auto-Healing
              </h2>
              <p className="mb-4 leading-relaxed">
                Your apps don't just run; they are continually monitored. If your application enters a Crash Loop (crashing repeatedly within seconds), SkyDeploy's Reliability Engine automatically halts the container.
              </p>
              <p className="mb-4 leading-relaxed">
                It then extracts the crash logic, RAM, and CPU telemetry, and feeds it into the AI Debugging agent which performs root-cause analysis on the failure, offering immediate fix semantics to you via the API.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
