# Start h5-video-tool-api (:3001) and h5-video-tool Vite (:5173) in separate windows.
# Usage (from repo root):  .\start-all.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting API (h5-video-tool-api :3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Set-Location -LiteralPath '$root\h5-video-tool-api'; npm run dev"
)

Start-Sleep -Seconds 2

Write-Host "Starting frontend (h5-video-tool :5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Set-Location -LiteralPath '$root\h5-video-tool'; npm run dev"
)

Write-Host ""
Write-Host "Done. Two windows opened." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  API:      http://localhost:3001" -ForegroundColor Yellow
Write-Host "  GeeLark:  http://localhost:5173/geelark-batch" -ForegroundColor Yellow
