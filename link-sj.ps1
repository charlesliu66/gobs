# 克隆仓库后若缺少目录联接，在仓库根目录执行: .\link-sj.ps1
# 将 SJ/web 联接到 h5-video-tool\src\sj-ui，便于在 IDE 中浏览矩阵前端源码。
# 运行矩阵请用: .\start-sj-matrix.ps1（Next 独立进程，默认 http://127.0.0.1:3000）
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Ensure-Junction($Link, $Target) {
  if (-not (Test-Path -LiteralPath $Target)) {
    Write-Warning "目标不存在，跳过: $Target"
    return
  }
  if (Test-Path -LiteralPath $Link) {
    Remove-Item -LiteralPath $Link -Force -Recurse
  }
  New-Item -ItemType Junction -Path $Link -Target $Target | Out-Null
  Write-Host "OK $Link -> $Target" -ForegroundColor Green
}

Ensure-Junction (Join-Path $root "h5-video-tool\src\sj-ui") (Join-Path $root "SJ\web")
$apiTarget = Join-Path $root "SJ\api"
if (Test-Path -LiteralPath $apiTarget) {
  Ensure-Junction (Join-Path $root "h5-video-tool-api\src\sj") $apiTarget
} else {
  Write-Host "跳过 api 联接（不存在）: $apiTarget" -ForegroundColor DarkYellow
}
