# SkyDeploy Start Script
# Run this script to start the API Server and the Client Interface

Write-Host "============================" -ForegroundColor Cyan
Write-Host "  Starting SkyDeploy...     " -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check if Docker is running
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop and run this script again." -ForegroundColor Red
    Pause
    exit
}

# 1. Start API-Server in a new background window
Write-Host "[1/2] Launching API-Server on port 4000..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd 'API-Server'; node server.js"

# 2. Start Client Interface in a new background window
Write-Host "[2/2] Launching Client Interface..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd 'Client'; npm run dev"

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host "  SkyDeploy is now running! " -ForegroundColor Green
Write-Host "  API Backend: http://localhost:4000" -ForegroundColor DarkGray
Write-Host "  Web Interface: Let the Vite terminal open your browser, or visit http://localhost:3000" -ForegroundColor DarkGray
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Note: You can close this window now. The two new powershell windows that popped up are your running servers." -ForegroundColor DarkGray
Write-Host "To shut down SkyDeploy, simply close those two powershell windows." -ForegroundColor DarkGray
Pause
