# 批量发布 Ai Videos 到三台云手机的 TikTok
# 使用前请：
# 1. 设置 $env:GEELARK_API_KEY
# 2. 将下方 GEELARK_ENV_IDS 改为你的三台云手机 ID（逗号分隔）

$ErrorActionPreference = "Stop"
$skillDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $skillDir)) { $skillDir = $PSScriptRoot }

# ========== 请填入你的三台云手机 ID ==========
$env:GEELARK_ENV_IDS = "请替换为id1,id2,id3"   # 例: "528086284158239744,528086284158239745,528086284158239746"
# ===========================================

$videoDir = "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos"
$videos = @(Get-ChildItem $videoDir -Recurse -File | Where-Object { $_.Extension -match '\.(mp4|mov|avi|mkv|webm)$' } | ForEach-Object { $_.FullName })

if ($videos.Count -eq 0) {
    Write-Host "未找到视频文件" -ForegroundColor Red
    exit 1
}

Write-Host "找到 $($videos.Count) 个视频，将发布到 3 台云手机的 TikTok" -ForegroundColor Cyan
$videoList = ($videos | ForEach-Object { $_ }) -join ','
Push-Location $skillDir
try {
    node scripts/publish.js --videos $videoList --env-ids $env:GEELARK_ENV_IDS --hashtags "#fyp #viral"
} finally {
    Pop-Location
}
