# Viral_Agent 调用脚本 - 定位 Viral_Agent.ps1 并转发参数
# 用法：.\run.ps1 -VideoPath "C:\path\to\video.mp4" [-Url "https://..."] [-SubtitlePath "xxx.srt"] 等

param(
  [string]$VideoPath,
  [string]$Url,
  [string[]]$VideoPaths = @(),
  [string[]]$Urls = @(),
  [string]$InputListPath,
  [string]$VideoDir,
  [switch]$VideoDirRecurse,
  [string]$SubtitlePath,
  [string]$CookiesPath,
  [ValidateSet("", "chrome", "edge", "firefox", "brave")]
  [string]$CookiesFromBrowser = "",
  [string]$YtDlpExe,
  [switch]$YtDlpNoCheckCertificate,
  [string[]]$TrendQueries = @(),
  [string[]]$TrendSourceUrls = @(),
  [switch]$TrendOnly,
  [switch]$BatchSummary,
  [string]$OutRoot = ".\out",
  [double]$SceneThreshold = 0.30,
  [double]$SceneFps = 2.0,
  [double]$ContactIntervalSec = 2.0
)

$ErrorActionPreference = "Stop"

# 查找 Viral_Agent.ps1
$candidates = @(
  $env:VIRAL_AGENT_ROOT,
  (Join-Path $env:USERPROFILE "Desktop\cursor_try\Viral_Agent"),
  (Join-Path $env:USERPROFILE "Desktop\Viral_Agent"),
  (Join-Path $PSScriptRoot "..\..\..\..\Viral_Agent")
) | Where-Object { $_ }

$scriptPath = $null
foreach ($base in $candidates) {
  $p = Join-Path $base "Viral_Agent.ps1"
  if (Test-Path -LiteralPath $p) {
    $scriptPath = $p
    break
  }
}

if (-not $scriptPath) {
  Write-Error @"
未找到 Viral_Agent.ps1。

请设置环境变量 VIRAL_AGENT_ROOT 指向 Viral_Agent 包根目录，或将其放置在以下之一：
  - $env:USERPROFILE\Desktop\cursor_try\Viral_Agent\
  - $env:USERPROFILE\Desktop\Viral_Agent\

设置示例：
  `$env:VIRAL_AGENT_ROOT = "C:\path\to\Viral_Agent"
"@
}

$invokeArgs = @("-ExecutionPolicy", "Bypass", "-File", $scriptPath)
if ($VideoPath) { $invokeArgs += @("-VideoPath", $VideoPath) }
if ($Url) { $invokeArgs += @("-Url", $Url) }
if ($VideoPaths -and $VideoPaths.Count -gt 0) { $invokeArgs += @("-VideoPaths", ($VideoPaths -join ",")) }
if ($Urls -and $Urls.Count -gt 0) { $invokeArgs += @("-Urls", ($Urls -join ",")) }
if ($InputListPath) { $invokeArgs += @("-InputListPath", $InputListPath) }
if ($VideoDir) { $invokeArgs += @("-VideoDir", $VideoDir) }
if ($VideoDirRecurse) { $invokeArgs += @("-VideoDirRecurse") }
if ($SubtitlePath) { $invokeArgs += @("-SubtitlePath", $SubtitlePath) }
if ($CookiesPath) { $invokeArgs += @("-CookiesPath", $CookiesPath) }
if ($CookiesFromBrowser) { $invokeArgs += @("-CookiesFromBrowser", $CookiesFromBrowser) }
if ($YtDlpExe) { $invokeArgs += @("-YtDlpExe", $YtDlpExe) }
if ($YtDlpNoCheckCertificate) { $invokeArgs += @("-YtDlpNoCheckCertificate") }
if ($TrendQueries -and $TrendQueries.Count -gt 0) { $invokeArgs += @("-TrendQueries", ($TrendQueries -join ",")) }
if ($TrendSourceUrls -and $TrendSourceUrls.Count -gt 0) { $invokeArgs += @("-TrendSourceUrls", ($TrendSourceUrls -join ",")) }
if ($TrendOnly) { $invokeArgs += @("-TrendOnly") }
if ($BatchSummary) { $invokeArgs += @("-BatchSummary") }
$invokeArgs += @("-OutRoot", $OutRoot)
$invokeArgs += @("-SceneThreshold", $SceneThreshold)
$invokeArgs += @("-SceneFps", $SceneFps)
$invokeArgs += @("-ContactIntervalSec", $ContactIntervalSec)

& powershell @invokeArgs
exit $LASTEXITCODE
