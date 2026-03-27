# QAS 项目打包脚本 - 用于拷贝到另一台电脑
# 包含：QAS 项目、video-pipeline、相关 Skills、配置模板
# 用法：在 QAS 目录下运行 .\scripts\package-for-transfer.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$qasRoot = Split-Path -Parent $scriptDir
$outDir = Join-Path $qasRoot "QAS-package"
$cursorSkills = Join-Path $env:USERPROFILE ".cursor\skills"
$qasSkills = Join-Path $qasRoot ".cursor\skills"
$cursorTry = Split-Path -Parent $qasRoot

Write-Host "=== QAS 打包脚本 ===" -ForegroundColor Cyan
Write-Host "输出目录: $outDir"
Write-Host ""

# 清理并创建输出目录
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# ----- 1. 复制 QAS 项目 -----
Write-Host "[1/4] 复制 QAS 项目..." -ForegroundColor Yellow
$qasDest = Join-Path $outDir "QAS"
New-Item -ItemType Directory -Path $qasDest -Force | Out-Null

$excludeQas = @(
    "node_modules", ".git", "QAS-package", ".next", "dist", "build",
    "*.log", ".env", "gmail.env", "*.pdf"
)
Get-ChildItem -Path $qasRoot -Exclude $excludeQas | ForEach-Object {
    if ($_.Name -eq "node_modules" -or $_.Name -eq ".git" -or $_.Name -eq "QAS-package") { return }
    Copy-Item -Path $_.FullName -Destination $qasDest -Recurse -Force -ErrorAction SilentlyContinue
}

# 排除子目录 node_modules
foreach ($sub in @("h5-video-tool", "h5-video-tool-api", "scripts\emulator-distribute")) {
    $subPath = Join-Path $qasDest $sub
    $nmPath = Join-Path $subPath "node_modules"
    if (Test-Path $nmPath) { Remove-Item $nmPath -Recurse -Force }
}

# 复制 .env.example 为 .env.template（提醒用户自行填写）
$envExample = Join-Path $qasRoot "h5-video-tool-api\.env.example"
if (Test-Path $envExample) {
    Copy-Item $envExample (Join-Path $qasDest "h5-video-tool-api\.env.template") -Force
}

# ----- 2. 复制 video-pipeline -----
Write-Host "[2/4] 复制 video-pipeline..." -ForegroundColor Yellow
$vpSrc = Join-Path $cursorTry "video-pipeline"
$vpDest = Join-Path $outDir "video-pipeline"
if (Test-Path $vpSrc) {
    New-Item -ItemType Directory -Path $vpDest -Force | Out-Null
    Get-ChildItem -Path $vpSrc -Exclude "node_modules", ".git" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $vpDest -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path (Join-Path $vpDest "node_modules")) {
        Remove-Item (Join-Path $vpDest "node_modules") -Recurse -Force
    }
    Write-Host "  video-pipeline 已复制"
} else {
    Write-Host "  警告: 未找到 video-pipeline 于 $vpSrc" -ForegroundColor Red
}

# ----- 3. 复制相关 Skills -----
Write-Host "[3/4] 复制 Cursor Skills..." -ForegroundColor Yellow
$skillsDest = Join-Path $outDir "cursor-skills"
New-Item -ItemType Directory -Path $skillsDest -Force | Out-Null

$skillNames = @(
    "video-create-distribute",
    "video-pipeline",
    "geelark-publish",
    "video-director",
    "storyboard-studio",
    "game-director-pro",
    "viral-agent"
)

foreach ($name in $skillNames) {
    $src = $null
    if (Test-Path (Join-Path $qasSkills $name)) { $src = Join-Path $qasSkills $name }
    elseif (Test-Path (Join-Path $cursorSkills $name)) { $src = Join-Path $cursorSkills $name }
    if ($src) {
        $dest = Join-Path $skillsDest $name
        Copy-Item -Path $src -Destination $dest -Recurse -Force
        Write-Host "  - $name"
    } else {
        Write-Host "  警告: 未找到 skill $name" -ForegroundColor Red
    }
}

# ----- 4. 生成配置模板与部署说明 -----
Write-Host "[4/4] 生成配置模板..." -ForegroundColor Yellow
$configDest = Join-Path $outDir "config-templates"
New-Item -ItemType Directory -Path $configDest -Force | Out-Null

# geelark.json 模板（脱敏）
$geelarkTemplate = @'
{
  "appId": "YOUR_GEELARK_APP_ID",
  "apiKey": "YOUR_GEELARK_API_KEY",
  "devices": [],
  "defaultEnvIds": [],
  "aiVideosPath": "C:\\Users\\YOUR_USER\\Desktop\\cursor_try\\Ai Videos",
  "latestJsonPath": "C:\\Users\\YOUR_USER\\Desktop\\cursor_try\\Ai Videos\\latest.json"
}
'@
$geelarkTemplate | Out-File (Join-Path $configDest 'geelark.json.template') -Encoding utf8

# 部署说明：从模板复制并插入打包时间
$deployTemplate = Join-Path $scriptDir 'DEPLOY-README-template.md'
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$deployReadme = (Get-Content $deployTemplate -Raw -Encoding UTF8) -replace '__TIMESTAMP__', $timestamp
$readmeFile = 'DEPLOY-README.md'
$deployReadme | Out-File (Join-Path $outDir $readmeFile) -Encoding utf8 -NoNewline

# ----- 5. Remove .env and output videos -----
Write-Host '[5/6] Cleaning .env and output videos...' -ForegroundColor Yellow
Get-ChildItem -Path $outDir -Recurse -Filter '.env' -File -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $outDir -Recurse -Filter 'gmail.env' -File -ErrorAction SilentlyContinue | Remove-Item -Force
$vidExt = @('*.mp4','*.webm','*.mov','*.avi')
Get-ChildItem -Path $outDir -Recurse -Include $vidExt -File -ErrorAction SilentlyContinue | Remove-Item -Force

# ----- 6. Create ZIP -----
Write-Host '[6/6] Creating ZIP...' -ForegroundColor Yellow
$dateFmt = Get-Date -Format 'yyyyMMdd-HHmm'
$zipName = 'QAS-deploy-' + $dateFmt + '.zip'
$zipPath = Join-Path $qasRoot $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zipSrc = $outDir + '\*'
Compress-Archive -Path $zipSrc -DestinationPath $zipPath -CompressionLevel Optimal

# ----- 完成 -----
$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host '=== 打包完成 ===' -ForegroundColor Green
Write-Host ('ZIP: ' + $zipPath + ' (' + $sizeMB + ' MB)')
Write-Host ""
Write-Host 'Next:' -ForegroundColor Cyan
Write-Host ('  1. Upload: scp ' + $zipName + ' user@host:/home/user/')
Write-Host ('  2. Unzip: unzip ' + $zipName)
Write-Host '  3. Follow DEPLOY-README.md or docs/deploy-ssh.md'
Write-Host '  4. Fill .env and config keys'
Write-Host ""
