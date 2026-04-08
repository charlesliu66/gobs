# 启动 TikTok 矩阵（SJ/web，Next.js，默认端口 3000）
# GOBS 前端在「TikTok 矩阵」页通过 iframe 嵌入该地址；请先保持本脚本运行。
$ErrorActionPreference = "Stop"
$web = Join-Path $PSScriptRoot "SJ\web"
if (-not (Test-Path -LiteralPath $web)) {
  Write-Error "未找到目录: $web（请确认 SJ/web 存在）"
}
Set-Location -LiteralPath $web
npm run dev
