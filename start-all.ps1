# Start API (3001) and Vite frontend (5173)
# Usage: .\start-all.ps1

Write-Host "Starting API (h5-video-tool-api :3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", "Set-Location -LiteralPath '$PSScriptRoot\h5-video-tool-api'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "Starting frontend (h5-video-tool :5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", "Set-Location -LiteralPath '$PSScriptRoot\h5-video-tool'; npm run dev"

Write-Host ""
Write-Host "Servers started in new windows." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API:      http://localhost:3001" -ForegroundColor Yellow
Write-Host "GeeLark:  http://localhost:5173/geelark-batch" -ForegroundColor Yellow
