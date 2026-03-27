# H5 视频工具部署打包脚本
# 用法：.\scripts\pack-h5-deploy.ps1
# 输出：QAS\h5-deploy-YYYYMMDD-HHmm.zip

# robocopy 返回 0-7 为成功，不视为错误
# 请在项目根目录执行：cd QAS; .\scripts\pack-h5-deploy.ps1
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root "h5-video-tool-api"))) { Write-Error "请在 QAS 项目根目录执行此脚本"; exit 1 }
$staging = Join-Path $env:TEMP "h5-deploy-staging"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$zipName = "h5-deploy-$timestamp.zip"
$zipPath = Join-Path $root $zipName

# 清理并创建临时目录
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host "正在打包 H5 部署文件..." -ForegroundColor Cyan

# 1. 复制 h5-video-tool-api（排除 node_modules、output、.env、.git）
$apiSrc = Join-Path $root "h5-video-tool-api"
$apiDst = Join-Path $staging "h5-video-tool-api"
New-Item -ItemType Directory -Path $apiDst -Force | Out-Null
$apiExclude = @("node_modules","output","out",".env",".git",".cursor","viral-analysis-out"); Get-ChildItem $apiSrc -Force | Where-Object { $apiExclude -notcontains $_.Name } | ForEach-Object { Copy-Item $_.FullName -Destination (Join-Path $apiDst $_.Name) -Recurse -Force }
Copy-Item "$apiSrc\.env.example" "$apiDst\.env.example" -Force -ErrorAction SilentlyContinue
Write-Host "  - h5-video-tool-api 已复制" -ForegroundColor Green

# 2. 复制 h5-video-tool（排除 node_modules、.env、.git）
$feSrc = Join-Path $root "h5-video-tool"
$feDst = Join-Path $staging "h5-video-tool"
New-Item -ItemType Directory -Path $feDst -Force | Out-Null
$feExclude = @("node_modules",".env",".git",".cursor",".vite"); Get-ChildItem $feSrc -Force | Where-Object { $feExclude -notcontains $_.Name } | ForEach-Object { Copy-Item $_.FullName -Destination (Join-Path $feDst $_.Name) -Recurse -Force }
Copy-Item "$feSrc\.env.example" "$feDst\.env.example" -Force -ErrorAction SilentlyContinue
Write-Host "  - h5-video-tool 已复制" -ForegroundColor Green

# 3. 复制部署说明
Copy-Item (Join-Path $root "DEPLOY.md") (Join-Path $staging "DEPLOY.md") -Force -ErrorAction SilentlyContinue

# 4. 创建 zip
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -CompressionLevel Optimal

# 5. 清理临时目录
Remove-Item $staging -Recurse -Force

$size = (Get-Item $zipPath).Length / 1MB
Write-Host "`n打包完成: $zipName ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
Write-Host "路径: $zipPath" -ForegroundColor Yellow
