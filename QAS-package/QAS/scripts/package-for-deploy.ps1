# QAS 项目完整打包脚本 - 用于上传到服务器部署/开发
# 包含：QAS 项目、video-pipeline、相关 Skills、脚本、素材、配置模板
# 输出：QAS-deploy-YYYYMMDD-HHmm.zip
# 用法：在 QAS 目录下运行 .\scripts\package-for-deploy.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$qasRoot = Split-Path -Parent $scriptDir
$tempDir = Join-Path $qasRoot "QAS-deploy-temp"
$zipName = "QAS-deploy-$(Get-Date -Format 'yyyyMMdd-HHmm').zip"
$zipPath = Join-Path $qasRoot $zipName
$cursorSkills = Join-Path $env:USERPROFILE ".cursor\skills"
$qasSkills = Join-Path $qasRoot ".cursor\skills"
$cursorTry = Split-Path -Parent $qasRoot

Write-Host "=== QAS 部署打包脚本 ===" -ForegroundColor Cyan
Write-Host "输出: $zipPath"
Write-Host ""

# 清理临时目录
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# ----- 1. 复制 QAS 项目 -----
Write-Host "[1/5] 复制 QAS 项目（含 scripts、video-materials、config、docs、.cursor）..." -ForegroundColor Yellow
$qasDest = Join-Path $tempDir "QAS"
New-Item -ItemType Directory -Path $qasDest -Force | Out-Null

$excludeNames = @("node_modules", ".git", "QAS-package", "QAS-deploy-temp", "QAS-deploy-*.zip", ".next", "dist", "build")
$excludeExt = @("*.log", "*.pdf")
Get-ChildItem -Path $qasRoot -Directory -Force | Where-Object { $excludeNames -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $qasDest -Recurse -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $qasRoot -File | Where-Object {
    $_.Name -notmatch '\.(env|log|pdf)$' -and $_.Name -ne 'gmail.env' -and $_.Name -notmatch '^QAS-deploy-.*\.zip$'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $qasDest -Force -ErrorAction SilentlyContinue
}

# 排除子目录 node_modules
foreach ($sub in @("h5-video-tool", "h5-video-tool-api", "scripts\emulator-distribute")) {
    $nmPath = Join-Path $qasDest $sub "node_modules"
    if (Test-Path $nmPath) { Remove-Item $nmPath -Recurse -Force }
}

# 排除敏感文件（不复制 .env、gmail.env）
foreach ($f in @(".env", "gmail.env")) {
    $p = Join-Path $qasDest $f
    if (Test-Path $p) { Remove-Item $p -Force }
}
$apiEnv = Join-Path $qasDest "h5-video-tool-api\.env"
if (Test-Path $apiEnv) { Remove-Item $apiEnv -Force }

# 排除 output 下的 .mp4 等大文件（保留目录结构和非视频文件）
$outputDirs = @(
    (Join-Path $qasDest "output"),
    (Join-Path $qasDest "h5-video-tool-api\output")
)
foreach ($od in $outputDirs) {
    if (Test-Path $od) {
        Get-ChildItem -Path $od -Recurse -File | Where-Object { $_.Extension -match '\.(mp4|webm|mov|avi)$' } | Remove-Item -Force
    }
}

# 复制 .env.example 为 .env.template
$envExample = Join-Path $qasRoot "h5-video-tool-api\.env.example"
if (Test-Path $envExample) {
    Copy-Item $envExample (Join-Path $qasDest "h5-video-tool-api\.env.template") -Force
}

# ----- 2. 复制 video-pipeline -----
Write-Host "[2/5] 复制 video-pipeline..." -ForegroundColor Yellow
$vpSrc = Join-Path $cursorTry "video-pipeline"
$vpDest = Join-Path $tempDir "video-pipeline"
if (Test-Path $vpSrc) {
    New-Item -ItemType Directory -Path $vpDest -Force | Out-Null
    Get-ChildItem -Path $vpSrc -Exclude "node_modules", ".git" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $vpDest -Recurse -Force -ErrorAction SilentlyContinue
    }
    $vpNm = Join-Path $vpDest "node_modules"
    if (Test-Path $vpNm) { Remove-Item $vpNm -Recurse -Force }
    Write-Host "  video-pipeline 已复制"
} else {
    Write-Host "  警告: 未找到 video-pipeline 于 $vpSrc" -ForegroundColor Red
}

# ----- 3. 复制 Cursor Skills -----
Write-Host "[3/5] 复制 Cursor Skills..." -ForegroundColor Yellow
$skillsDest = Join-Path $tempDir "cursor-skills"
New-Item -ItemType Directory -Path $skillsDest -Force | Out-Null

$skillNames = @(
    "video-create-distribute", "video-pipeline", "geelark-publish",
    "video-director", "storyboard-studio", "game-director-pro", "viral-agent"
)
foreach ($name in $skillNames) {
    $src = $null
    if (Test-Path (Join-Path $qasSkills $name)) { $src = Join-Path $qasSkills $name }
    elseif (Test-Path (Join-Path $cursorSkills $name)) { $src = Join-Path $cursorSkills $name }
    if ($src) {
        Copy-Item -Path $src -Destination (Join-Path $skillsDest $name) -Recurse -Force
        Write-Host "  - $name"
    } else {
        Write-Host "  警告: 未找到 skill $name" -ForegroundColor Red
    }
}

# ----- 4. 配置模板与部署说明 -----
Write-Host "[4/5] 生成配置模板与部署说明..." -ForegroundColor Yellow
$configDest = Join-Path $tempDir "config-templates"
New-Item -ItemType Directory -Path $configDest -Force | Out-Null

@'
{
  "appId": "YOUR_GEELARK_APP_ID",
  "apiKey": "YOUR_GEELARK_API_KEY",
  "devices": [],
  "defaultEnvIds": [],
  "aiVideosPath": "/path/to/Ai Videos",
  "latestJsonPath": "/path/to/Ai Videos/latest.json"
}
'@ | Out-File (Join-Path $configDest "geelark.json.template") -Encoding utf8

# 服务器部署简要说明
@'
# QAS 服务器部署 - 快速说明

## 解压后目录结构
- QAS/          主项目（h5-video-tool、h5-video-tool-api、scripts、video-materials、config、docs 等）
- video-pipeline/  视频生成流水线
- cursor-skills/   相关 Cursor Skills，需复制到 ~/.cursor/skills/
- config-templates/ 配置模板

## 部署步骤（Linux/macOS）
1. 安装 Node.js 18+
2. cd QAS/h5-video-tool-api && npm install && npm run build && cp .env.template .env && 编辑 .env
3. cd ../h5-video-tool && npm install && npm run build
4. PM2 启动: pm2 start QAS/h5-video-tool-api/dist/index.js --name qas-api
5. 静态托管: pm2 serve QAS/h5-video-tool/dist 5173 --name qas-h5

详细说明见 QAS/docs/deploy-ssh.md
'@ | Out-File (Join-Path $tempDir "SERVER-DEPLOY.md") -Encoding utf8

$deployTemplate = Join-Path $scriptDir "DEPLOY-README-template.md"
if (Test-Path $deployTemplate) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm'
    (Get-Content $deployTemplate -Raw -Encoding UTF8) -replace '__TIMESTAMP__', $ts |
        Out-File (Join-Path $tempDir "DEPLOY-README.md") -Encoding utf8 -NoNewline
}

# ----- 5. 压缩为 ZIP -----
Write-Host "[5/5] 压缩为 ZIP..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

# 清理临时目录
Remove-Item $tempDir -Recurse -Force

$size = (Get-Item $zipPath).Length / 1MB
Write-Host ""
Write-Host "=== 打包完成 ===" -ForegroundColor Green
Write-Host "输出: $zipPath"
Write-Host "大小: $([math]::Round($size, 2)) MB"
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  1. Upload: scp $zipName user@host:/home/user/"
Write-Host "  2. Unzip: unzip $zipName"
Write-Host "  3. Follow SERVER-DEPLOY.md or QAS/docs/deploy-ssh.md"
Write-Host "  4. Fill .env and config keys"
Write-Host ""
