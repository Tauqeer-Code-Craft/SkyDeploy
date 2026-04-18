# SkyDeploy 🚀

SkyDeploy is an ultra-fast, local-first Platform-as-a-Service (PaaS) orchestration engine built for developers who want the convenience of serverless without the strict timeouts, restrictive routing, or heavy cloud billing statements. 

Deploy React, Node.js, and Python web apps in zero seconds either from a ZIP, a Git repository, or generated purely from an AI Prompt natively on-device.

## ✨ Core Features
- **Zero-Config Deployments:** Link a Git repository or upload a ZIP folder. Hardcoded app ports are dynamically patched, mapped, and deployed with zero configuration.
- **AI Development & Automated Sandbox:** Native Multi-LLM support (Ollama/Phi-3, Gemini, Claude). Ask for an app, and SkyDeploy will write, build, and deploy it. Code is automatically sanitized before running to prevent Remote Code Execution (`child_process`, `fs`). 
- **Enterprise-Grade Container Security:** All deployments run under strict quotas (default 1GB RAM, 1 CPU limit, max 100 PIDs), drop all kernel capabilities (`--cap-drop=ALL`), and enforce `no-new-privileges` true.
- **ZIP-Slip Prevention:** Directory traversal checks ensure no malicious nested archives can execute sandbox escapes during upload extraction.
- **Dynamic Caddy Reverse Proxy & Load Balancing:** The engine hooks locally into Caddy and the HTTP Dev Proxy. It uses internal Docker DNS routing across a unified network to map traffic immediately.
- **Container Replication & High Availability:** Spin up multiple identical replicas. The built-in orchestrator dynamically balances traffic across them with active health checking.
- **Zero-Downtime Rolling Deploys:** Applications update transparently by shifting traffic gracefully from old containers to new ones only after passing health-checks, avoiding any downtime.

## 🛡️ Reliability & AI Debugging (New in v4.0)
SkyDeploy now monitors applications autonomously:
- **Crash Loop Detector:** If your container experiences contiguous repeated crashes within 60 seconds (OOM limits, syntax failure), SkyDeploy halts it to prevent grid lockups.
- **AI-Powered Analytics:** The integrated Reliability Engine (`aiEngine.js`) will harvest the failed logs and container stats (CPU/MEM usage), passing it to your Local LLM. The AI will output a JSON report explaining the exact semantics of *why* your app crashed and exactly how to fix it on the dashboard.

## 📚 Documentation & Architecture
We have completely revamped our UI and documentation page. Boot the application up and click **Documentation** in the Navigation bar, or see: 
- 📊 **[Performance & Security Benchmarks](./benchmark_report.md)**: Tabular breakdown of deployment speeds, resource utilization, and inference latency.
- 🏗️ **[Architecture Diagrams](./architecture.md)**: Detailed Mermaid diagrams showcasing the Security Model, System Design, and Monitoring Loops.
- 🔬 **[Academic Research Reference](./research_reference.md)**: Read the formal breakdown of the architectural novelty in SkyDeploy for academic publication.

## 🛠️ Tech Stack
- **Frontend Stack:** React + Vite + Tailwind CSS + Lucide Icons
- **Backend Stack:** Node.js + Express.js + Sequelize (SQLite Base)
- **Infrastructure:** Docker Engine + Caddy Server
- **AI Analytics:** Local Ollama Pipeline / Anthropic API / Gemini API

## 🚀 Installation & Usage

**Prerequisites:** You must have Docker Engine and Node.js installed on your machine.

Run the automated install script on Windows:
```powershell
.\install.ps1
```
This performs a full NPM install for both Client and API, and subsequently builds the Docker images for deployment environments (`skydeploy-build-server` and `skydeploy-build-python`).

### Running the Application

```powershell
.\start.ps1
```
This kicks off the React Vite bundler and the Node API server simultaneously. Access the Web UI at `http://localhost:5173`.

## 🥊 SkyDeploy vs. Traditional Cloud PaaS

SkyDeploy's isolated container architecture unlocks capabilities traditionally gatekept by expensive cloud ecosystems.

| Feature | SkyDeploy (Container-First) | Traditional Serverless/PaaS |
| :--- | :--- | :--- |
| **⏱️ Execution Limits** | **UNLIMITED:** Run inference daemons or websocket networks indefinitely locally. | **TIMEOUTS:** Hard 10-15 minute cuts on operations. |
| **🤖 AI Integration** | **PROMPT TO DEPLOY:** AI builds the app and provisions the hardware live. | **STATIC PIPELINES:** Requires manual commits pushing through remote CI/CD. |
| **💸 Hardware/Cost** | **100% FREE & NATIVE:** Run on bare-metal access on your own hardware without markup. | **EXPENSIVE & ABSTRACTED:** High vendor markup and lack of hardware passthrough. |
| **🩺 Reliability Engine** | **ACTIVE AI INTERCEPT:** Crashes automatically trigger an AI debugger that analyzes your logs. | **RAW LOGS:** Sift through thousands of logs manually in a web dashboard. |
| **🔒 Data Sandbox** | **AIR-GAPPED OPERATION:** Your code stays local. ZIP-Slip, UID maps, and isolated caps. | **PUBLIC STORAGE:** Source code resides on third party proprietary edge-nodes. |
