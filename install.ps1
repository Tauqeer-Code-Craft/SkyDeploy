# SkyDeploy Installation Script
# Run this script once to install dependencies and build Docker images.

Write-Host "============================" -ForegroundColor Cyan
Write-Host "  Installing SkyDeploy...   " -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# 1. API-Server
Write-Host "`n[1/3] Setting up API-Server..." -ForegroundColor Yellow
Set-Location ".\API-Server"
npm install
Set-Location ".."

# 2. Client (Frontend)
Write-Host "`n[2/3] Setting up Client..." -ForegroundColor Yellow
Set-Location ".\Client"
npm install
Set-Location ".."

# 3. Docker Images
Write-Host "`n[3/3] Building Docker Images (this may take a while)..." -ForegroundColor Yellow
Set-Location ".\Build-Server"

Write-Host "-> Building Node Environment Image..." -ForegroundColor DarkGray
docker build -t skydeploy-build-server -f Dockerfile.node .

Write-Host "-> Building Python Environment Image..." -ForegroundColor DarkGray
docker build -t skydeploy-build-python -f Dockerfile.python .
Set-Location ".."

# 4. AI Development Engine (Ollama)
Write-Host "`n[4/4] Setting up Local AI Engine (Ollama + Phi-3 Mini)..." -ForegroundColor Yellow
Write-Host "-> Starting Ollama Container in background..." -ForegroundColor DarkGray

docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

Write-Host "-> Pulling Phi-3 Mini model (This will take a few minutes)..." -ForegroundColor DarkGray
docker exec ollama ollama pull phi3:mini

docker exec ollama ollama pull phi3

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host "  Installation Complete! You can now run start.ps1  " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
