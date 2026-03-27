# 同时启动前后端（TikTok 矩阵需后端 3001）
# 用法：.\start-all.ps1

Write-Host "启动后端 (h5-video-tool-api :3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\h5-video-tool-api'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "启动前端 (h5-video-tool :5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\h5-video-tool'; npm run dev"

Write-Host "`n前后端已在新窗口启动。" -ForegroundColor Green
Write-Host "前端: http://localhost:5173" -ForegroundColor Yellow
Write-Host "后端: http://localhost:3001" -ForegroundColor Yellow
Write-Host "TikTok 矩阵: http://localhost:5173/geelark-batch" -ForegroundColor Yellow
