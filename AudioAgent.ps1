param(
  [Parameter(Mandatory = $true)]
  [string]$Video,

  [string]$Out = (Join-Path (Get-Location) "out"),

  [ValidateSet("vlog","travel","gaming","cooking","sports","product","education","cinematic","horror","unknown")]
  [string]$VideoType = "unknown",

  [ValidateSet("prompt_only","library","suno")]
  [string]$Music = "prompt_only",

  [ValidateSet("content_realworld","library_sync","hybrid","none")]
  [string]$Sfx = "hybrid",

  [string]$Assets,
  [string]$Manifest,
  [string]$Library,
  [switch]$AutoIndexLibrary,

  [int]$Seed = 42,
  [int]$MaxSfx = 40,
  [double]$SceneGridSec = 2.0,

  [switch]$Render,
  [string]$OutputVideo,
  [double]$MusicGainDb = -18.0,

  [switch]$AnalyzeRefMusic,
  [int]$RefAnalyzeSeconds = 45,

  [switch]$AnalyzeViralEdit,
  [double]$SceneThreshold = 0.35,
  [double]$BeatWindowSec = 0.10,
  [double]$BeatMatchToleranceSec = 0.12,

  [switch]$ReportExcel,
  [ValidateSet("xlsx","csv")]
  [string]$ReportFormat = "xlsx",

  [switch]$ClassifyStyle,

  [switch]$AnalyzeContent,
  [switch]$AutoMusic,
  [int]$ContentAnalyzeSeconds = 20,
  [double]$ContentFps = 2.0,

  [switch]$InstallFFmpeg,
  [string]$FFmpegBundleUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$assetsExplicit = $PSBoundParameters.ContainsKey("Assets")
$manifestExplicit = $PSBoundParameters.ContainsKey("Manifest")
$libraryExplicit = $PSBoundParameters.ContainsKey("Library")

function New-JobId {
  return (Get-Date).ToString("yyyyMMdd_HHmmss")
}

function Is-HttpUrl([string]$s) {
  if (-not $s) { return $false }
  return ($s -match "^(?i)https?://")
}

function Sanitize-FileStem([string]$s) {
  if (-not $s) { return "output" }
  $stem = $s -replace "\.[^.]+$",""
  # Keep: ascii letters/digits/_/-, plus common CJK ideographs. Replace everything else with underscore.
  $stem = $stem -replace "[^0-9A-Za-z_\\-\\p{IsCJKUnifiedIdeographs}]+","_"
  $stem = $stem.Trim("_")
  if (-not $stem) { $stem = "output" }
  return $stem
}

function Get-Sha256Hex([string]$s) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($s)
    $hash = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace "-","").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Resolve-VideoInput([string]$videoArg, [string]$jobDir) {
  # Supports:
  # - local file path
  # - directory: pick newest video file
  # - wildcard: pick newest match
  # - http(s) url: download to jobDir
  # NOTE: Windows paths may contain [] which PowerShell treats as wildcards.
  if (Test-Path -LiteralPath $videoArg -PathType Leaf) {
    return @{ path=(Resolve-Path -LiteralPath $videoArg).Path; source="file" }
  }
  if (Test-Path -LiteralPath $videoArg -PathType Container) {
    $dir = (Resolve-Path -LiteralPath $videoArg).Path
    $exts = @("*.mp4","*.mov","*.mkv","*.webm","*.m4v","*.avi")
    $files = @()
    foreach ($e in $exts) {
      $files += @(Get-ChildItem -LiteralPath $dir -Filter $e -File -ErrorAction SilentlyContinue)
    }
    if (-not $files -or $files.Count -eq 0) { throw "No video files found in directory: $dir" }
    $pick = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return @{ path=$pick.FullName; source="dir_latest" }
  }

  if (Is-HttpUrl $videoArg) {
    $name = [IO.Path]::GetFileName(([Uri]$videoArg).AbsolutePath)
    if (-not $name) { $name = "input_video" }
    $dst = Join-Path $jobDir $name
    try {
      Invoke-WebRequest -Uri $videoArg -OutFile $dst -UseBasicParsing | Out-Null
      return @{ path=$dst; source="download" }
    } catch {
      throw "Video URL download failed: $videoArg"
    }
  }

  $paths = @()
  try {
    $paths = @(Get-ChildItem -Path $videoArg -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
  } catch {
    $paths = @()
  }

  if ($paths.Count -eq 1 -and (Test-Path -LiteralPath $paths[0] -PathType Container)) {
    $dir = $paths[0]
    $exts = @("*.mp4","*.mov","*.mkv","*.webm","*.m4v","*.avi")
    $files = @()
    foreach ($e in $exts) {
      $files += @(Get-ChildItem -LiteralPath $dir -Filter $e -File -ErrorAction SilentlyContinue)
    }
    if (-not $files -or $files.Count -eq 0) { throw "No video files found in directory: $dir" }
    $pick = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return @{ path=$pick.FullName; source="dir_latest" }
  }

  if ($paths.Count -gt 1) {
    $files = $paths | ForEach-Object { Get-Item -LiteralPath $_ -ErrorAction SilentlyContinue } | Where-Object { $_ -and -not $_.PSIsContainer }
    if (-not $files -or $files.Count -eq 0) { throw "Video wildcard matched no files: $videoArg" }
    $pick = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return @{ path=$pick.FullName; source="glob_latest" }
  }

  if (Test-Path -LiteralPath $videoArg -PathType Leaf) {
    return @{ path=(Resolve-Path -LiteralPath $videoArg).Path; source="file" }
  }

  throw "Video not found: $videoArg"
}

function Run-ExternalCapture([string]$exe, [string[]]$args) {
  $pinfo = New-Object System.Diagnostics.ProcessStartInfo
  $pinfo.FileName = $exe
  $pinfo.Arguments = ($args -join " ")
  $pinfo.RedirectStandardError = $true
  $pinfo.RedirectStandardOutput = $true
  $pinfo.UseShellExecute = $false
  $pinfo.CreateNoWindow = $true
  $proc = [System.Diagnostics.Process]::Start($pinfo)
  $stderr = $proc.StandardError.ReadToEnd()
  $stdout = $proc.StandardOutput.ReadToEnd()
  $proc.WaitForExit() | Out-Null
  return @{ code=$proc.ExitCode; stdout=$stdout; stderr=$stderr }
}

function Invoke-FFmpegCapture([string[]]$ffArgs) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { throw "ffmpeg not found" }
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & $ffmpeg @ffArgs 2>&1
    $code = $LASTEXITCODE
    return @{ code=$code; out=$out }
  } finally {
    $ErrorActionPreference = $prev
  }
}

function Get-ExePath([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Get-CommonToolPaths([string]$exeName) {
  $cands = @()
  if ($PSScriptRoot) { $cands += (Join-Path $PSScriptRoot $exeName) }
  $cands += (Join-Path (Get-Location) $exeName)
  $cands += (Join-Path $env:USERPROFILE "scoop\\shims\\$exeName")
  $cands += "C:\\ProgramData\\chocolatey\\bin\\$exeName"
  $cands += "C:\\ffmpeg\\bin\\$exeName"
  $cands += "C:\\Program Files\\ffmpeg\\bin\\$exeName"
  $cands += "C:\\Tools\\ffmpeg\\bin\\$exeName"
  foreach ($p in $cands) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

function Get-FFmpegPath {
  if ($env:FFMPEG) { return $env:FFMPEG }
  $p = Get-CommonToolPaths "ffmpeg.exe"
  if ($p) { return $p }
  return (Get-ExePath "ffmpeg")
}

function Get-FFprobePath {
  if ($env:FFPROBE) { return $env:FFPROBE }
  $p = Get-CommonToolPaths "ffprobe.exe"
  if ($p) { return $p }
  return (Get-ExePath "ffprobe")
}

function Ensure-FFmpegTools([string]$outDir, [switch]$install, [string]$bundleUrl) {
  $ffmpeg = Get-FFmpegPath
  $ffprobe = Get-FFprobePath
  if ($ffmpeg) { return @{ ffmpeg=$ffmpeg; ffprobe=$ffprobe; status="found" } }

  # Try bundled tools/ffmpeg/bin
  if ($PSScriptRoot) {
    $cand = Join-Path $PSScriptRoot "tools\\ffmpeg\\bin\\ffmpeg.exe"
    if (Test-Path -LiteralPath $cand) {
      $env:FFMPEG = $cand
      $p2 = Join-Path (Split-Path -Parent $cand) "ffprobe.exe"
      if (Test-Path -LiteralPath $p2) { $env:FFPROBE = $p2 }
      return @{ ffmpeg=$cand; ffprobe=(Get-FFprobePath); status="bundled" }
    }
  }

  if (-not $install) { return @{ ffmpeg=$null; ffprobe=$null; status="missing" } }
  if (-not (Is-HttpUrl $bundleUrl)) { return @{ ffmpeg=$null; ffprobe=$null; status="missing_no_url" } }

  $cacheRoot = Join-Path $outDir "_cache\\ffmpeg"
  Ensure-Dir $cacheRoot
  $key = Get-Sha256Hex $bundleUrl
  $dl = Join-Path $cacheRoot ("bundle_" + $key + ".zip")
  $unzipped = Join-Path $cacheRoot ("unzipped_" + $key)
  try {
    if (-not (Test-Path -LiteralPath $dl)) {
      Invoke-WebRequest -Uri $bundleUrl -OutFile $dl -UseBasicParsing | Out-Null
    }
    if (-not (Test-Path -LiteralPath $unzipped)) {
      Ensure-Dir $unzipped
      Expand-Archive -LiteralPath $dl -DestinationPath $unzipped -Force
    }
    $ffmpegExe = Get-ChildItem -LiteralPath $unzipped -Recurse -Filter "ffmpeg.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $ffmpegExe) { return @{ ffmpeg=$null; ffprobe=$null; status="downloaded_but_no_ffmpeg" } }
    $ffprobeExe = Get-ChildItem -LiteralPath $unzipped -Recurse -Filter "ffprobe.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    $env:FFMPEG = $ffmpegExe.FullName
    if ($ffprobeExe) { $env:FFPROBE = $ffprobeExe.FullName }
    $fp = $null
    if ($ffprobeExe) { $fp = $ffprobeExe.FullName }
    return @{ ffmpeg=$ffmpegExe.FullName; ffprobe=$fp; status="downloaded" }
  } catch {
    return @{ ffmpeg=$null; ffprobe=$null; status=("download_failed: " + $_.Exception.GetType().Name) }
  }
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-Text([string]$Path, [string]$Text) {
  Ensure-Dir (Split-Path -Parent $Path)
  [IO.File]::WriteAllText($Path, $Text, [Text.Encoding]::UTF8)
  return $Path
}

function Write-Json([string]$Path, $Obj) {
  Ensure-Dir (Split-Path -Parent $Path)
  $json = $Obj | ConvertTo-Json -Depth 20
  [IO.File]::WriteAllText($Path, $json, [Text.Encoding]::UTF8)
  return $Path
}

function Read-Json([string]$Path) {
  return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8) | ConvertFrom-Json
}

function Guess-TagsFromPath([string]$fullPath) {
  $name = ([IO.Path]::GetFileNameWithoutExtension($fullPath)).ToLowerInvariant()
  $parts = $fullPath.ToLowerInvariant() -split "[\\\\/]"
  $tokens = @()
  foreach ($p in $parts) {
    foreach ($t in ($p -split "[^a-z0-9]+")) {
      if ($t -and $t.Length -ge 3) { $tokens += $t }
    }
  }
  foreach ($t in ($name -split "[^a-z0-9]+")) {
    if ($t -and $t.Length -ge 3) { $tokens += $t }
  }
  $stop = @("audio","music","sfx","sound","sounds","foley","real","world","assets","asset","wav","mp3","flac","aac","m4a","ogg","opus")
  $seen = @{}
  $out = @()
  foreach ($t in $tokens) {
    if ($stop -contains $t) { continue }
    if (-not $seen.ContainsKey($t)) { $seen[$t] = $true; $out += $t }
  }
  return $out
}

function AutoIndex-Library([string]$assetsRoot, [string]$outManifestPath) {
  $root = (Resolve-Path -LiteralPath $assetsRoot).Path
  $musicExt = @(".wav",".mp3",".flac",".m4a",".aac",".ogg",".opus")
  $items = @()

  $musicDir = Join-Path $root "music"
  $sfxDir = Join-Path $root "sfx"

  $scanDirs = @()
  if (Test-Path -LiteralPath $musicDir) { $scanDirs += @{ kind="music"; dir=$musicDir } }
  if (Test-Path -LiteralPath $sfxDir) { $scanDirs += @{ kind="sfx"; dir=$sfxDir } }
  if ($scanDirs.Count -eq 0) { $scanDirs += @{ kind="sfx"; dir=$root } }

  foreach ($sd in $scanDirs) {
    $kind = $sd.kind
    $dir = $sd.dir
    $files = Get-ChildItem -LiteralPath $dir -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
      $musicExt -contains $_.Extension.ToLowerInvariant()
    }
    foreach ($f in $files) {
      $rel = [IO.Path]::GetRelativePath($root, $f.FullName)
      $tags = @(Guess-TagsFromPath $f.FullName)
      if ($kind -eq "music" -and -not ($tags -contains "no_vocals")) {
        # Conservative default; user can edit tags later.
        $tags += "no_vocals"
      }
      $items += @{ kind=$kind; path=$rel; tags=$tags }
    }
  }

  $obj = @{ root=$root; items=$items }
  Write-Json $outManifestPath $obj | Out-Null
  return $outManifestPath
}

function Resolve-LibraryInputs([string]$libraryArg, [string]$assetsArg, [string]$manifestArg, [string]$outDir, [string]$jobDir, [switch]$autoIndex) {
  # Priority:
  # 1) explicit -Manifest / -Assets
  # 2) -Library can be: local dir | local json | http(s) json | http(s) zip
  $assets = $assetsArg
  $manifest = $manifestArg

  $cacheRoot = Join-Path $outDir "_cache\\libraries"
  Ensure-Dir $cacheRoot

  if (-not $assets -and -not $manifest -and $libraryArg) {
    if (Is-HttpUrl $libraryArg) {
      $key = Get-Sha256Hex $libraryArg
      $libDir = Join-Path $cacheRoot $key
      Ensure-Dir $libDir
      $fname = [IO.Path]::GetFileName(([Uri]$libraryArg).AbsolutePath)
      if (-not $fname) { $fname = "library" }
      $dst = Join-Path $libDir $fname
      if (-not (Test-Path -LiteralPath $dst)) {
        Invoke-WebRequest -Uri $libraryArg -OutFile $dst -UseBasicParsing | Out-Null
      }
      if ($dst.ToLowerInvariant().EndsWith(".zip")) {
        $unzipped = Join-Path $libDir "unzipped"
        if (-not (Test-Path -LiteralPath $unzipped)) {
          Ensure-Dir $unzipped
          Expand-Archive -LiteralPath $dst -DestinationPath $unzipped -Force
        }
        $assets = $unzipped
        $candidate = Join-Path $assets "library_manifest.json"
        if (Test-Path -LiteralPath $candidate) { $manifest = $candidate }
      } else {
        $manifest = $dst
        $assets = (Split-Path -Parent $dst)
      }
    } else {
      if (Test-Path -LiteralPath $libraryArg -PathType Container) {
        $assets = (Resolve-Path -LiteralPath $libraryArg).Path
        $candidate = Join-Path $assets "library_manifest.json"
        if (Test-Path -LiteralPath $candidate) { $manifest = $candidate }
      } elseif (Test-Path -LiteralPath $libraryArg -PathType Leaf) {
        $ext = ([IO.Path]::GetExtension($libraryArg)).ToLowerInvariant()
        if ($ext -eq ".json") {
          $manifest = (Resolve-Path -LiteralPath $libraryArg).Path
          $assets = (Split-Path -Parent $manifest)
        } elseif ($ext -eq ".zip") {
          $key = Get-Sha256Hex ((Resolve-Path -LiteralPath $libraryArg).Path)
          $libDir = Join-Path $cacheRoot ("local_" + $key)
          Ensure-Dir $libDir
          $unzipped = Join-Path $libDir "unzipped"
          if (-not (Test-Path -LiteralPath $unzipped)) {
            Ensure-Dir $unzipped
            Expand-Archive -LiteralPath $libraryArg -DestinationPath $unzipped -Force
          }
          $assets = $unzipped
          $candidate = Join-Path $assets "library_manifest.json"
          if (Test-Path -LiteralPath $candidate) { $manifest = $candidate }
        }
      }
    }
  }

  if ($assets -and -not $manifest -and $autoIndex) {
    $manifest = Join-Path $jobDir "library_manifest.auto.json"
    AutoIndex-Library $assets $manifest | Out-Null
  }

  return @{ assets=$assets; manifest=$manifest }
}

function Probe-Video([string]$VideoPath) {
  $ffprobe = Get-FFprobePath
  if ($ffprobe) {
    $dur = 0.0
    try {
      $d = & $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 -- "$VideoPath"
      if ($LASTEXITCODE -eq 0 -and $d) { $dur = [double]("$d".Trim()) }
    } catch { $dur = 0.0 }

    $hasAudio = $false
    try {
      $a = & $ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 -- "$VideoPath"
      if ($LASTEXITCODE -eq 0 -and $a -and "$a".Trim().Length -gt 0) { $hasAudio = $true }
    } catch { $hasAudio = $false }

    return @{
      duration_sec = $dur
      has_audio = $hasAudio
      probe = "ffprobe_ok"
    }
  }

  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) {
    return @{
      duration_sec = 0.0
      has_audio = $null
      probe = "no_ffprobe_no_ffmpeg"
    }
  }

  # Fallback: parse `ffmpeg -i` stderr.
  $dur2 = 0.0
  $hasAudio2 = $false
  try {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $ffmpeg
    $pinfo.Arguments = "-hide_banner -i " + ('"' + $VideoPath.Replace('"','\"') + '"')
    $pinfo.RedirectStandardError = $true
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($pinfo)
    $stderr = $proc.StandardError.ReadToEnd()
    $stdout = $proc.StandardOutput.ReadToEnd()
    $proc.WaitForExit() | Out-Null
    $txt = ($stderr + "`n" + $stdout)

    if ($txt -match "Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})") {
      $hh = [int]$Matches[1]; $mm = [int]$Matches[2]; $ss = [int]$Matches[3]; $cs = [int]$Matches[4]
      $dur2 = ($hh * 3600.0) + ($mm * 60.0) + $ss + ($cs / 100.0)
    }
    if ($txt -match "Stream #\d+:\d+.*Audio:") { $hasAudio2 = $true }
  } catch {
    $dur2 = 0.0
    $hasAudio2 = $false
  }

  return @{
    duration_sec = $dur2
    has_audio = $hasAudio2
    probe = "ffmpeg_parse"
  }
}

function Extract-RefAudioWav([string]$videoPath, [string]$outWav, [int]$seconds) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { throw "ffmpeg not found for reference audio extraction." }
  $secs = [Math]::Max(5, $seconds)
  Invoke-FFmpegCapture @(
    "-hide_banner","-y",
    "-i",[string]$videoPath,
    "-vn",
    "-ac","1",
    "-ar","48000",
    "-t",[string]$secs,
    [string]$outWav
  ) | Out-Null
  # Some files print warnings but still generate valid output; accept as long as output exists.
  if (-not (Test-Path -LiteralPath $outWav)) {
    throw "Failed to extract reference audio wav."
  }
  return $outWav
}

function Analyze-AudioWithFfmpeg([string]$wavPath) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { return @{ ok=$false; reason="ffmpeg_missing" } }

  $analysis = @{
    ok = $true
    source = $wavPath
    mean_volume_db = $null
    max_volume_db = $null
    rms_db = $null
    peak_db = $null
    dynamic_range_db = $null
    notes = @()
  }

  # volumedetect
  $vArgs = @("-hide_banner","-i",('"' + $wavPath.Replace('"','\"') + '"'),"-af","volumedetect","-f","null","NUL")
  $vRes = Run-ExternalCapture $ffmpeg $vArgs
  $txt = $vRes.stderr + "`n" + $vRes.stdout
  if ($txt -match "mean_volume:\s*([-\d\.]+)\s*dB") { $analysis.mean_volume_db = [double]$Matches[1] }
  if ($txt -match "max_volume:\s*([-\d\.]+)\s*dB") { $analysis.max_volume_db = [double]$Matches[1] }

  # astats (tolerant parse; keys vary by build)
  $aArgs = @("-hide_banner","-i",('"' + $wavPath.Replace('"','\"') + '"'),"-af","astats=metadata=1:reset=1","-f","null","NUL")
  $aRes = Run-ExternalCapture $ffmpeg $aArgs
  $at = $aRes.stderr + "`n" + $aRes.stdout

  if ($at -match "Overall\.RMS_level:\s*([-\d\.]+)") { $analysis.rms_db = [double]$Matches[1] }
  if ($at -match "Overall\.Peak_level:\s*([-\d\.]+)") { $analysis.peak_db = [double]$Matches[1] }
  if ($at -match "Overall\.Dynamic_range:\s*([-\d\.]+)") { $analysis.dynamic_range_db = [double]$Matches[1] }

  if (-not $analysis.mean_volume_db) { $analysis.notes += "mean_volume_missing" }
  if (-not $analysis.dynamic_range_db) { $analysis.notes += "dynamic_range_missing" }
  return $analysis
}

function Get-IntervalStats($times) {
  $arr = @($times)
  if ($arr.Count -lt 3) { return @{ ok=$false } }
  $ints = @()
  for ($i = 1; $i -lt $arr.Count; $i++) { $ints += ([double]$arr[$i] - [double]$arr[$i - 1]) }
  $ints = $ints | Where-Object { $_ -ge 0.12 -and $_ -le 1.0 }
  if (-not $ints -or $ints.Count -lt 3) { return @{ ok=$false } }
  $mean = ($ints | Measure-Object -Average).Average
  $var = 0.0
  foreach ($x in $ints) { $var += ([Math]::Pow(([double]$x - $mean), 2.0)) }
  $var = $var / [double]$ints.Count
  $std = [Math]::Sqrt($var)
  $cv = $null
  if ($mean -gt 0) { $cv = $std / $mean }
  return @{ ok=$true; mean=$mean; std=$std; cv=$cv; count=$ints.Count }
}

function Classify-EditStyle($analysis, $viralReport, $refAudioAnalysis) {
  # Labels: high_burn(高燃), beat_sync(卡点), epic_orchestral(史诗管弦), edm
  $scores = @{
    high_burn = 0.0
    beat_sync = 0.0
    epic_orchestral = 0.0
    edm = 0.0
  }
  $reasons = @{
    high_burn = @()
    beat_sync = @()
    epic_orchestral = @()
    edm = @()
  }

  $bpm = $null
  $cutRate = $null
  $matchRate = $null
  $peakCv = $null
  if ($viralReport -and $viralReport.ok) {
    $bpm = $viralReport.bpm_est
    $cutRate = $viralReport.cut_rate_per_sec
    $matchRate = $viralReport.beat_match_rate
    if ($viralReport.peaks_interval_stats -and $viralReport.peaks_interval_stats.ok) {
      $peakCv = $viralReport.peaks_interval_stats.cv
    }
  }

  $meanVol = $null
  $dyn = $null
  if ($refAudioAnalysis -and $refAudioAnalysis.ok) {
    $meanVol = $refAudioAnalysis.mean_volume_db
    $dyn = $refAudioAnalysis.dynamic_range_db
  }

  # Beat-sync (卡点)
  if ($matchRate -ne $null) {
    if ($matchRate -ge 0.55) { $scores.beat_sync += 1.0; $reasons.beat_sync += "High cut-to-beat alignment (match_rate >= 0.55)." }
    elseif ($matchRate -ge 0.35) { $scores.beat_sync += 0.6; $reasons.beat_sync += "Medium cut-to-beat alignment (match_rate >= 0.35)." }
    elseif ($matchRate -ge 0.20) { $scores.beat_sync += 0.3; $reasons.beat_sync += "Some cut-to-beat alignment (match_rate >= 0.20)." }
  }
  if ($cutRate -ne $null -and $cutRate -ge 0.6) { $scores.beat_sync += 0.2; $reasons.beat_sync += "Cut density supports beat-driven pacing (cuts/sec >= 0.6)." }

  # EDM
  if ($bpm -ne $null) {
    if ($bpm -ge 124) { $scores.edm += 0.7; $reasons.edm += "BPM in common EDM range (>=124)." }
    elseif ($bpm -ge 110) { $scores.edm += 0.3; $reasons.edm += "BPM is mid-fast (>=110)." }
  }
  if ($peakCv -ne $null) {
    if ($peakCv -le 0.25) { $scores.edm += 0.4; $reasons.edm += "Beat peaks are regular (low interval CV)." }
    elseif ($peakCv -le 0.40) { $scores.edm += 0.2; $reasons.edm += "Beat peaks are moderately regular." }
  }
  if ($dyn -ne $null -and $dyn -lt 10) { $scores.edm += 0.2; $reasons.edm += "Tighter dynamics often fit electronic mixes." }

  # High-burn / hype (高燃)
  if ($bpm -ne $null -and $bpm -ge 135) { $scores.high_burn += 0.5; $reasons.high_burn += "Fast BPM (>=135)." }
  if ($cutRate -ne $null) {
    if ($cutRate -ge 0.9) { $scores.high_burn += 0.6; $reasons.high_burn += "Very high cut density (>=0.9 cuts/sec)." }
    elseif ($cutRate -ge 0.6) { $scores.high_burn += 0.35; $reasons.high_burn += "High cut density (>=0.6 cuts/sec)." }
  }
  if ($meanVol -ne $null) {
    if ($meanVol -gt -16) { $scores.high_burn += 0.3; $reasons.high_burn += "Loud modern mix (mean_volume > -16 dB)." }
    elseif ($meanVol -gt -20) { $scores.high_burn += 0.15; $reasons.high_burn += "Moderately loud mix (mean_volume > -20 dB)." }
  }

  # Epic / orchestral (史诗管弦) — heuristic fallback (no timbre model)
  if ($dyn -ne $null -and $dyn -ge 12) { $scores.epic_orchestral += 0.6; $reasons.epic_orchestral += "Wide dynamics (dynamic_range >= 12 dB)." }
  if ($bpm -ne $null -and $bpm -le 120) { $scores.epic_orchestral += 0.25; $reasons.epic_orchestral += "Slower BPM (<=120) can fit cinematic builds." }
  if ($analysis.video_type -eq "cinematic") { $scores.epic_orchestral += 0.3; $reasons.epic_orchestral += "Video type hint is cinematic." }

  $maxLabel = ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1)
  $top = [string]$maxLabel.Name
  $topScore = [double]$maxLabel.Value
  $second = ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -Skip 1 | Select-Object -First 1)
  $gap = 0.0
  if ($second) { $gap = $topScore - [double]$second.Value }
  $confidence = [Math]::Max(0.1, [Math]::Min(0.95, (0.35 + (0.25 * $gap) + (0.15 * $topScore))))

  $labels = @()
  foreach ($k in $scores.Keys) {
    if ([double]$scores[$k] -ge ($topScore - 0.25) -and [double]$scores[$k] -ge 0.45) { $labels += $k }
  }
  if ($labels.Count -eq 0) { $labels = @($top) }

  return @{
    ok = $true
    labels = $labels
    primary = $top
    confidence = $confidence
    scores = $scores
    reasons = $reasons
  }
}

function Build-SunoPromptFromReference($basePromptText, $audioAnalysis, [string]$videoTypeValue) {
  $parts = @()
  $parts += "Generate music similar to the reference background track."
  $parts += "Use the same overall vibe and arrangement style; no vocals."

  if ($videoTypeValue -and $videoTypeValue -ne "unknown") {
    $parts += ("Context: video type is {0}." -f $videoTypeValue)
  }

  if ($audioAnalysis -and $audioAnalysis.ok) {
    if ($null -ne $audioAnalysis.mean_volume_db) {
      if ($audioAnalysis.mean_volume_db -gt -16) { $parts += "Modern loud mix, punchy and compressed." }
      elseif ($audioAnalysis.mean_volume_db -gt -22) { $parts += "Moderately loud mix, clean and balanced." }
      else { $parts += "Softer mix, more dynamic headroom." }
    }
    if ($null -ne $audioAnalysis.dynamic_range_db) {
      if ($audioAnalysis.dynamic_range_db -lt 8) { $parts += "Tight dynamics, consistent energy." }
      elseif ($audioAnalysis.dynamic_range_db -lt 12) { $parts += "Medium dynamics, gentle movement." }
      else { $parts += "Wide dynamics, cinematic swells." }
    }
  }

  # Keep the original type-based prompt as a guide (this gives genre/instrument hints).
  if ($basePromptText) {
    $parts += ("Guide: {0}" -f $basePromptText.Trim())
  }
  return ($parts -join " ")
}

function Try-LoadSystemDrawing() {
  try {
    Add-Type -AssemblyName System.Drawing | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Analyze-VideoContentSimple([string]$videoPath, [string]$jobDir, [int]$seconds, [double]$fps) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { return @{ ok=$false; reason="ffmpeg_missing" } }
  $sec = [Math]::Max(5, $seconds)
  $sampleFps = [Math]::Max(0.5, $fps)
  $framesDir = Join-Path $jobDir "frames"
  Ensure-Dir $framesDir

  # Extract small frames for basic motion/brightness analysis.
  $args = @(
    "-hide_banner","-y",
    "-i",$videoPath,
    "-t",[string]$sec,
    "-vf",("fps=" + $sampleFps + ",scale=160:-1"),
    (Join-Path $framesDir "f_%04d.png")
  )
  Invoke-FFmpegCapture $args | Out-Null

  $files = @(Get-ChildItem -LiteralPath $framesDir -Filter "f_*.png" -File -ErrorAction SilentlyContinue | Sort-Object Name)
  if (-not $files -or $files.Count -lt 3) {
    return @{ ok=$false; reason="no_frames"; frames_dir=$framesDir; frame_count=($files.Count) }
  }

  if (-not (Try-LoadSystemDrawing)) {
    return @{ ok=$false; reason="system_drawing_unavailable"; frames_dir=$framesDir; frame_count=$files.Count }
  }

  $brightnessSum = 0.0
  $brightnessSumSq = 0.0
  $brightnessN = 0
  $motionSum = 0.0
  $motionN = 0

  $prev = $null
  foreach ($f in $files) {
    $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
    try {
      $w = $bmp.Width
      $h = $bmp.Height
      $stepX = [Math]::Max(1, [int]([Math]::Floor($w / 64)))
      $stepY = [Math]::Max(1, [int]([Math]::Floor($h / 64)))
      $frameBrightness = 0.0
      $frameCount = 0
      $frameMotion = 0.0
      $frameMotionCount = 0

      for ($y = 0; $y -lt $h; $y += $stepY) {
        for ($x = 0; $x -lt $w; $x += $stepX) {
          $c = $bmp.GetPixel($x, $y)
          $lum = (0.2126 * $c.R + 0.7152 * $c.G + 0.0722 * $c.B) / 255.0
          $frameBrightness += $lum
          $frameCount++
          if ($prev -ne $null) {
            $p = $prev.GetPixel($x, $y)
            $pl = (0.2126 * $p.R + 0.7152 * $p.G + 0.0722 * $p.B) / 255.0
            $frameMotion += [Math]::Abs($lum - $pl)
            $frameMotionCount++
          }
        }
      }

      if ($frameCount -gt 0) {
        $b = $frameBrightness / $frameCount
        $brightnessSum += $b
        $brightnessSumSq += ($b * $b)
        $brightnessN++
      }
      if ($frameMotionCount -gt 0) {
        $m = $frameMotion / $frameMotionCount
        $motionSum += $m
        $motionN++
      }
    } finally {
      if ($prev -ne $null) { $prev.Dispose() }
      $prev = $bmp
    }
  }
  if ($prev -ne $null) { $prev.Dispose() }

  $brightnessAvg = $null
  $brightnessStd = $null
  if ($brightnessN -gt 0) {
    $brightnessAvg = $brightnessSum / $brightnessN
    $var = ($brightnessSumSq / $brightnessN) - ($brightnessAvg * $brightnessAvg)
    if ($var -lt 0) { $var = 0 }
    $brightnessStd = [Math]::Sqrt($var)
  }
  $motionScore = $null
  if ($motionN -gt 0) { $motionScore = $motionSum / $motionN }

  return @{
    ok=$true
    analyze_seconds=$sec
    sample_fps=$sampleFps
    frames_dir=$framesDir
    frame_count=$files.Count
    brightness_avg=$brightnessAvg
    brightness_std=$brightnessStd
    motion_score=$motionScore
  }
}

function Auto-MusicPromptFromSignals($basePrompt, $styleObj, $contentObj, $viralReport) {
  # Start from base prompt and add constraints from style/content.
  $p = $basePrompt
  $add = @()
  if ($styleObj -and $styleObj.ok) {
    switch ($styleObj.primary) {
      "edm" { $add += "EDM / festival energy, sidechained bass, big synth leads." }
      "beat_sync" { $add += "Strong beat accents and clear transient hits for cut points." }
      "high_burn" { $add += "Hype, aggressive energy, punchy drums, fast transitions." }
      "epic_orchestral" { $add += "Epic cinematic orchestral feel, big strings/brass, impacts and risers." }
    }
  }
  if ($viralReport -and $viralReport.ok -and $viralReport.bpm_est) {
    $add += ("Target BPM around {0}." -f $viralReport.bpm_est)
  }
  if ($contentObj -and $contentObj.ok -and $contentObj.motion_score -ne $null) {
    if ([double]$contentObj.motion_score -ge 0.06) { $add += "High motion visuals: keep rhythm driving and energetic." }
    elseif ([double]$contentObj.motion_score -le 0.03) { $add += "Lower motion visuals: keep arrangement less busy." }
  }
  if ($add.Count -gt 0) {
    $p = ($p.Trim().TrimEnd(".") + ". " + ($add -join " "))
  }
  return $p
}

function Get-AudioEnergyPeaks([string]$videoOrAudioPath, [int]$seconds, [double]$windowSec) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { return @{ ok=$false; reason="ffmpeg_missing" } }

  $secs = [Math]::Max(5, $seconds)
  $sr = 8000
  $win = [Math]::Max(0.02, $windowSec)
  $samplesPerWin = [int]([Math]::Max(40, [Math]::Round($sr * $win)))

  $pinfo = New-Object System.Diagnostics.ProcessStartInfo
  $pinfo.FileName = $ffmpeg
  $pinfo.Arguments = "-hide_banner -v error -y -i " + ('"' + $videoOrAudioPath.Replace('"','\"') + '"') + " -vn -ac 1 -ar $sr -t $secs -f s16le -"
  $pinfo.RedirectStandardOutput = $true
  $pinfo.RedirectStandardError = $true
  $pinfo.UseShellExecute = $false
  $pinfo.CreateNoWindow = $true
  $proc = [System.Diagnostics.Process]::Start($pinfo)
  $ms = New-Object System.IO.MemoryStream
  $proc.StandardOutput.BaseStream.CopyTo($ms)
  $stderr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit() | Out-Null
  if ($proc.ExitCode -ne 0 -or $ms.Length -le 0) {
    return @{ ok=$false; reason="decode_failed"; stderr=$stderr }
  }

  $bytes = $ms.ToArray()
  $sampleCount = [int]($bytes.Length / 2)
  if ($sampleCount -le ($samplesPerWin * 3)) {
    return @{ ok=$false; reason="too_short" }
  }

  $winCount = [int]([Math]::Floor($sampleCount / $samplesPerWin))
  $rms = New-Object double[] $winCount
  for ($w = 0; $w -lt $winCount; $w++) {
    $sum = 0.0
    $base = $w * $samplesPerWin
    for ($i = 0; $i -lt $samplesPerWin; $i++) {
      $off = ($base + $i) * 2
      $s = [BitConverter]::ToInt16($bytes, $off)
      $v = [double]$s / 32768.0
      $sum += ($v * $v)
    }
    $rms[$w] = [Math]::Sqrt($sum / $samplesPerWin)
  }

  $sorted = @($rms) | Sort-Object
  $p85 = $sorted[[int]([Math]::Floor($sorted.Length * 0.85))]

  $peaks = New-Object System.Collections.Generic.List[double]
  for ($i = 1; $i -lt ($rms.Length - 1); $i++) {
    if ($rms[$i] -lt $p85) { continue }
    if ($rms[$i] -ge $rms[$i - 1] -and $rms[$i] -gt $rms[$i + 1]) {
      $t = $i * ($samplesPerWin / [double]$sr)
      $peaks.Add([double]$t) | Out-Null
    }
  }

  $minGap = [Math]::Max(0.08, $win)
  $dedup = New-Object System.Collections.Generic.List[double]
  foreach ($t in $peaks) {
    if ($dedup.Count -eq 0 -or ($t - $dedup[$dedup.Count - 1]) -ge $minGap) {
      $dedup.Add($t) | Out-Null
    }
  }

  $bpm = $null
  if ($dedup.Count -ge 6) {
    $ints = New-Object System.Collections.Generic.List[double]
    for ($i = 1; $i -lt $dedup.Count; $i++) { $ints.Add($dedup[$i] - $dedup[$i - 1]) | Out-Null }
    $ints2 = @($ints) | Where-Object { $_ -ge 0.12 -and $_ -le 1.0 } | Sort-Object
    if ($ints2.Count -ge 3) {
      $med = $ints2[[int]([Math]::Floor($ints2.Count / 2))]
      $b = 60.0 / $med
      while ($b -lt 80) { $b *= 2 }
      while ($b -gt 180) { $b /= 2 }
      $bpm = [int][Math]::Round($b)
    }
  }

  return @{
    ok=$true
    window_sec=$win
    threshold=$p85
    rms_count=$rms.Length
    peak_times_sec=@($dedup)
    bpm_est=$bpm
  }
}

function Detect-SceneCuts([string]$videoPath, [double]$sceneThreshold, [int]$seconds) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) { return @{ ok=$false; reason="ffmpeg_missing" } }
  $thr = [Math]::Max(0.05, [Math]::Min(0.95, $sceneThreshold))
  $secs = [Math]::Max(5, $seconds)
  $res = Invoke-FFmpegCapture @(
    "-hide_banner",
    "-i",[string]$videoPath,
    "-t",[string]$secs,
    "-an",
    "-vf",("select='gt(scene," + $thr + ")',showinfo"),
    "-f","null","NUL"
  )
  $txt = ($res.out -join "`n")
  $times = New-Object System.Collections.Generic.List[double]
  $matchedLines = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($txt -split "`r?`n")) {
    if ($line -match "pts_time:([0-9]+(?:\.[0-9]+)?)") {
      $times.Add([double]$Matches[1]) | Out-Null
      if ($matchedLines.Count -lt 5) { $matchedLines.Add($line) | Out-Null }
    }
  }
  $dedup = New-Object System.Collections.Generic.List[double]
  $minGap = 0.30
  foreach ($t in ($times | Sort-Object)) {
    if ($dedup.Count -eq 0 -or ($t - $dedup[$dedup.Count - 1]) -ge $minGap) {
      $dedup.Add($t) | Out-Null
    }
  }
  $out = @{ ok=$true; scene_threshold=$thr; cut_times_sec=@($dedup); ffmpeg_exit_code=$res.code; matched_lines=@($matchedLines) }
  if ($times.Count -eq 0) {
    $head = @($res.out | Select-Object -First 25 | ForEach-Object { "$_" })
    $out.debug_out_head = $head
  }
  return $out
}

function Compare-CutsToBeats($cuts, $peaks, [double]$tolSec) {
  if (-not $cuts.ok -or -not $peaks.ok) { return @{ ok=$false; reason="missing_inputs" } }
  $c = @($cuts.cut_times_sec)
  $p = @($peaks.peak_times_sec)
  if ($c.Count -eq 0 -or $p.Count -eq 0) { return @{ ok=$true; match_rate=0.0; match_count=0; cut_count=$c.Count; matches=@() } }

  $beatMatches = New-Object System.Collections.Generic.List[object]
  $pi = 0
  foreach ($ct in $c) {
    while ($pi -lt $p.Count -and $p[$pi] -lt ($ct - $tolSec)) { $pi++ }
    $best = $null
    $bestD = 1e9
    for ($j = [Math]::Max(0, $pi - 1); $j -lt [Math]::Min($p.Count, $pi + 2); $j++) {
      $d = [Math]::Abs($p[$j] - $ct)
      if ($d -lt $bestD) { $bestD = $d; $best = $p[$j] }
    }
    if ($best -ne $null -and $bestD -le $tolSec) {
      $beatMatches.Add(@{ cut_t=$ct; peak_t=$best; delta_sec=$bestD }) | Out-Null
    }
  }
  $rate = 0.0
  if ($c.Count -gt 0) { $rate = $beatMatches.Count / [double]$c.Count }
  return @{
    ok=$true
    tolerance_sec=$tolSec
    match_rate=$rate
    match_count=$beatMatches.Count
    cut_count=$c.Count
    matches=$beatMatches.ToArray()
  }
}

function Build-ViralReport($analysis, $videoInfo, $musicPrompt, $cuts, $peaks, $compare, [int]$analyzeSeconds) {
  $duration = [double]$videoInfo.duration_sec
  $cutCount = if ($cuts.ok) { @($cuts.cut_times_sec).Count } else { 0 }
  $windowSec = [double]$analyzeSeconds
  if ($duration -gt 0 -and $duration -lt $windowSec) { $windowSec = $duration }
  $cutRate = $null
  if ($windowSec -gt 0 -and $cutCount -gt 0) { $cutRate = $cutCount / $windowSec }
  $bpm = if ($peaks.ok) { $peaks.bpm_est } else { $null }
  $matchRate = if ($compare.ok) { $compare.match_rate } else { $null }
  $peakStats = $null
  if ($peaks -and $peaks.ok) { $peakStats = Get-IntervalStats $peaks.peak_times_sec }

  $why = @()
  if ($matchRate -ne $null) {
    if ($matchRate -ge 0.55) { $why += "Many cuts land near audio energy peaks (strong beat-sync). Visual change aligns to strong beats, which feels more energetic." }
    elseif ($matchRate -ge 0.30) { $why += "Some cuts land near audio peaks (weak beat-sync). Transitions/action points still echo the rhythm." }
    else { $why += "Beat-sync is not obvious. The perceived energy likely comes more from camera motion and visual density than strict beat matching." }
  }
  if ($cutRate -ne $null) {
    if ($cutRate -ge 0.8) { $why += "High cut density (fast cutting) increases information flow and perceived intensity." }
    elseif ($cutRate -ge 0.4) { $why += "Medium cut density works well with a clear build-up/drop structure." }
    else { $why += "Low cut density tends to feel more cinematic or atmospheric." }
  }
  if ($bpm) {
    if ($bpm -ge 140) { $why += "Estimated BPM is fast, suitable for hype edits and fast cuts." }
    elseif ($bpm -ge 110) { $why += "Estimated BPM is medium-fast, good for transition beat-sync." }
    else { $why += "Estimated BPM is slower, better for mood-driven edits." }
  }

  $promptParts = @()
  $promptParts += "Create a viral high-energy edit background track with strong beat accents and punchy transitions, no vocals."
  if ($bpm) { $promptParts += ("Target BPM around {0}." -f $bpm) }
  if ($cutRate -ne $null) {
    if ($cutRate -ge 0.8) { $promptParts += "Fast pacing, dense drops, frequent impacts/whooshes to match rapid cuts." }
    elseif ($cutRate -ge 0.4) { $promptParts += "Clear build-up and drop, rhythmic hits for cut points." }
    else { $promptParts += "Cinematic pacing with emphasized accents at key cut points." }
  }
  $promptParts += ("Genre guide: {0}" -f $musicPrompt.text.Trim())
  $promptParts += "Mix: modern loud and punchy, tight low-end, crisp transients. Avoid vocals. Avoid long intros."
  $sunoPrompt = ($promptParts -join " ")

  $md = @()
  $md += "# Viral Edit (Music vs. Cuts) Analysis"
  $md += ""
  $md += ("- Analyze window (sec): {0:N2}" -f $windowSec)
  $md += ("- Video type: {0} (confidence {1:N2})" -f $analysis.video_type, [double]$analysis.confidence)
  if ($duration -gt 0) { $md += ("- Video duration (sec): {0}" -f $duration) }
  $md += ("- Cut count (within window): {0}" -f $cutCount)
  if ($cutRate -ne $null) { $md += ("- Cut density (cuts/sec): {0:N3}" -f $cutRate) }
  if ($bpm) { $md += ("- Estimated BPM: {0}" -f $bpm) }
  if ($matchRate -ne $null) { $md += ("- Beat-sync rate (cuts near energy peaks): {0:P1}" -f $matchRate) }
  if ($peakStats -and $peakStats.ok -and $peakStats.cv -ne $null) { $md += ("- Beat regularity (interval CV): {0:N3}" -f [double]$peakStats.cv) }
  $md += ""
  $md += "## Why it feels energetic"
  foreach ($w in $why) { $md += ("- " + $w) }
  $md += ""
  $md += "## Suno Prompt (copy/paste)"
  $md += ""
  $md += $sunoPrompt
  $md += ""

  return @{
    ok=$true
    analyze_seconds=$analyzeSeconds
    cut_count=$cutCount
    cut_rate_per_sec=$cutRate
    bpm_est=$bpm
    beat_match_rate=$matchRate
    peaks_interval_stats=$peakStats
    why=@($why)
    suno_prompt=$sunoPrompt
    markdown=($md -join "`r`n")
  }
}

function Infer-VideoType([string]$VideoPath) {
  $name = ([IO.Path]::GetFileName($VideoPath)).ToLowerInvariant()
  $map = @(
    @{ t="gaming"; ks=@("gameplay","valorant","cs2","lol","dota","apex","pubg","gta","minecraft","fortnite") },
    @{ t="cooking"; ks=@("cook","cooking","recipe","kitchen","food","meal","bake","bbq") },
    @{ t="travel"; ks=@("travel","trip","vacation","vlog_travel","tour","walk","street") },
    @{ t="sports"; ks=@("sport","match","highlights","basketball","football","soccer","mma","boxing","gym") },
    @{ t="product"; ks=@("review","unbox","unboxing","hands_on","product","setup") },
    @{ t="education"; ks=@("tutorial","howto","course","lesson","learn","explained") },
    @{ t="horror"; ks=@("horror","creepy","scary","thriller") },
    @{ t="cinematic"; ks=@("cinematic","trailer","film","shortfilm","montage") },
    @{ t="vlog"; ks=@("vlog","daily","life","dayinmylife") }
  )
  foreach ($row in $map) {
    foreach ($k in $row.ks) {
      if ($name.Contains($k)) {
        return @{ video_type=$row.t; confidence=0.55; cues=@{ filename=$name; matched_keyword=$k } }
      }
    }
  }
  return @{ video_type="unknown"; confidence=0.1; cues=@{ filename=$name } }
}

function Build-MusicPrompt([string]$VideoTypeValue) {
  switch ($VideoTypeValue) {
    "gaming" { return @{ text="High-energy electronic track for competitive gameplay, punchy drums, modern synth bass, fast transitions, no vocals."; negative="lyrics, vocals, spoken word"; bpm_hint=140; mood_tags=@("energetic","aggressive","modern"); instrumentation_tags=@("synth","drums","bass") } }
    "cooking" { return @{ text="Warm upbeat groove for cooking video, light funk pop, clean guitars, soft percussion, friendly, no vocals."; negative="lyrics, vocals, heavy distortion"; bpm_hint=110; mood_tags=@("warm","upbeat","cozy"); instrumentation_tags=@("guitar","bass","percussion") } }
    "travel" { return @{ text="Cinematic chill track for travel montage, airy pads, gentle beat, uplifting progression, no vocals."; negative="lyrics, vocals, harsh noise"; bpm_hint=100; mood_tags=@("uplifting","dreamy"); instrumentation_tags=@("pads","light_drums") } }
    "sports" { return @{ text="Intense sports highlight music, hybrid cinematic + trap drums, big hits, risers, no vocals."; negative="lyrics, vocals, long quiet intro"; bpm_hint=150; mood_tags=@("intense","epic"); instrumentation_tags=@("drums","brass","hits") } }
    "product" { return @{ text="Clean modern tech background music, minimal future bass, tight beat, bright plucks, no vocals."; negative="lyrics, vocals, overly busy arrangement"; bpm_hint=120; mood_tags=@("clean","modern"); instrumentation_tags=@("plucks","synth","tight_drums") } }
    "education" { return @{ text="Neutral unobtrusive background music for tutorial, light lo-fi, soft drums, no vocals."; negative="lyrics, vocals, heavy bass"; bpm_hint=90; mood_tags=@("calm","focused"); instrumentation_tags=@("lofi","soft_drums") } }
    "horror" { return @{ text="Dark suspense underscore, drones, distant impacts, minimal rhythm, no vocals."; negative="lyrics, vocals, cheerful melody"; bpm_hint=70; mood_tags=@("dark","tense"); instrumentation_tags=@("drones","impacts") } }
    "cinematic" { return @{ text="Cinematic trailer-style music, evolving strings and brass, impacts and risers, no vocals."; negative="lyrics, vocals, comedy"; bpm_hint=120; mood_tags=@("epic","wide"); instrumentation_tags=@("strings","brass","impacts") } }
    Default { return @{ text="Light modern background music for short video, simple groove, minimal arrangement, no vocals."; negative="lyrics, vocals, harsh sounds"; bpm_hint=105; mood_tags=@("light","modern"); instrumentation_tags=@("minimal","groove") } }
  }
}

function Ensure-AssetsSkeleton([string]$AssetsDir) {
  Ensure-Dir $AssetsDir
  Ensure-Dir (Join-Path $AssetsDir "music")
  Ensure-Dir (Join-Path $AssetsDir "sfx\\real_world")
  Ensure-Dir (Join-Path $AssetsDir "sfx\\foley")
}

function Resolve-LibraryPath($manifestObj, [string]$relOrAbs) {
  if ([IO.Path]::IsPathRooted($relOrAbs)) { return $relOrAbs }
  $root = $manifestObj.root
  if (-not $root) { $root = (Split-Path -Parent $Manifest) }
  return (Join-Path $root $relOrAbs)
}

function Find-LibraryItems($manifestObj, [string]$kind, [string[]]$requiredTags) {
  $req = @{}
  foreach ($t in $requiredTags) {
    if (-not $t) { continue }
    $req[$t.ToLowerInvariant()] = $true
  }
  $out = @()
  foreach ($it in ($manifestObj.items | ForEach-Object { $_ })) {
    if ($it.kind -ne $kind) { continue }
    $tags = @{}
    foreach ($t in ($it.tags | ForEach-Object { $_ })) {
      $tags["$t".ToLowerInvariant()] = $true
    }
    $ok = $true
    foreach ($k in $req.Keys) {
      if (-not $tags.ContainsKey($k)) { $ok = $false; break }
    }
    if ($ok) { $out += $it }
  }
  return $out
}

function Pick-Random([Random]$rng, $items) {
  if (-not $items -or $items.Count -eq 0) { return $null }
  return $items[$rng.Next(0, $items.Count)]
}

function Base-SfxTags([string]$VideoTypeValue) {
  switch ($VideoTypeValue) {
    "gaming" { return @("whoosh","impact","ui_click") }
    "cooking" { return @("knife","chop","sizzle","plate","whoosh") }
    "travel" { return @("whoosh","camera_shutter","footstep","city_ambience") }
    "sports" { return @("impact","crowd","whistle","whoosh") }
    "product" { return @("ui_click","whoosh","tap") }
    "education" { return @("ui_click","marker","whoosh_soft") }
    "horror" { return @("hit","rumble","whisper_wind") }
    "cinematic" { return @("hit","riser","whoosh") }
    Default { return @("whoosh","ui_click") }
  }
}

function New-SceneGridTimes([double]$durationSec, [double]$gridSec) {
  if ($durationSec -le 0) { return @(0,1,2,3,4) }
  $g = [Math]::Max(0.25, $gridSec)
  $n = [Math]::Max(1, [int][Math]::Floor($durationSec / $g))
  $arr = @()
  for ($i = 0; $i -le $n; $i++) { $arr += ($i * $g) }
  return $arr
}

$jobId = New-JobId
$jobDir = Join-Path $Out $jobId
Ensure-Dir $jobDir

# Ensure FFmpeg is available for features that need it.
$needFfmpeg = ($Render -or $AnalyzeRefMusic -or $AnalyzeViralEdit -or $InstallFFmpeg)
$ffTools = Ensure-FFmpegTools $Out $needFfmpeg $FFmpegBundleUrl

# Resolve video (supports local dir/glob/url)
$videoResolved = Resolve-VideoInput $Video $jobDir
$Video = $videoResolved.path

# Resolve library inputs (local path or online link)
$libResolved = Resolve-LibraryInputs $Library $Assets $Manifest $Out $jobDir $AutoIndexLibrary
$Assets = $libResolved.assets
$Manifest = $libResolved.manifest

if ($Assets -and $assetsExplicit) { Ensure-AssetsSkeleton $Assets }

$probe = Probe-Video $Video
$analysis = $null
if ($VideoType -ne "unknown") {
  $analysis = @{ video_type=$VideoType; confidence=0.9; cues=@{ hint=$true; probe=$probe.probe } }
} else {
  $analysis = Infer-VideoType $Video
  $analysis.cues.probe = $probe.probe
}

$videoInfo = @{ path=$Video; duration_sec=$probe.duration_sec; fps=$null; width=$null; height=$null; has_audio=$probe.has_audio }
$musicPrompt = Build-MusicPrompt $analysis.video_type

# Lightweight content analysis (motion/brightness) for auto-scoring.
$contentObj = $null
if ($AnalyzeContent -or $AutoMusic) {
  try {
    $contentObj = Analyze-VideoContentSimple $Video $jobDir $ContentAnalyzeSeconds $ContentFps
  } catch {
    $contentObj = @{ ok=$false; reason="content_analysis_exception"; message=$_.Exception.Message }
  }
}

$manifestObj = $null
if ($Manifest) { $manifestObj = Read-Json $Manifest }

$artifacts = @{}
$artifacts.job_dir = $jobDir
$artifacts.video_resolved = $Video
$artifacts.video_resolve_source = $videoResolved.source
$artifacts.library_assets = $Assets
$artifacts.library_manifest = $Manifest
$artifacts.ffmpeg_status = $ffTools.status
$artifacts.ffmpeg_path = $ffTools.ffmpeg
$artifacts.ffprobe_path = $ffTools.ffprobe
$artifacts.analysis_json = Write-Json (Join-Path $jobDir "analysis.json") $analysis
$artifacts.video_json = Write-Json (Join-Path $jobDir "video.json") $videoInfo
$artifacts.music_prompt_txt = Write-Text (Join-Path $jobDir "music_prompt.txt") $musicPrompt.text
$artifacts.music_prompt_json = Write-Json (Join-Path $jobDir "music_prompt.json") (@{ video_type=$analysis.video_type } + $musicPrompt)
if ($contentObj -ne $null) {
  $artifacts.content_json = Write-Json (Join-Path $jobDir "content.json") $contentObj
}

# Music generation
if ($Music -eq "library") {
  if (-not $manifestObj) {
    $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") "No library manifest; skipped."
  } else {
    $cands = Find-LibraryItems $manifestObj "music" @($analysis.video_type,"no_vocals")
    if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "music" @($analysis.video_type) }
    if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "music" @("no_vocals") }
    if (-not $cands -or $cands.Count -eq 0) {
      $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") "No matching library music found; skipped."
    } else {
      $rng = [Random]::new($Seed)
      $chosen = Pick-Random $rng $cands
      $p = Resolve-LibraryPath $manifestObj $chosen.path
      $artifacts.music_audio_path_txt = Write-Text (Join-Path $jobDir "music_audio_path.txt") $p
    }
  }
}
elseif ($Music -eq "suno") {
  $sunoCli = $env:SUNO_CLI
  if (-not $sunoCli) {
    $cmd = Get-Command suno -ErrorAction SilentlyContinue
    if ($cmd) { $sunoCli = $cmd.Source }
  }
  $sunoToken = $env:SUNO_TOKEN
  if (-not $sunoToken) { $sunoToken = $env:SUNO_COOKIE }
  if (-not $sunoCli -or -not $sunoToken) {
    $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") "Suno credentials/CLI not found (SUNO_CLI + SUNO_TOKEN/SUNO_COOKIE). Auto-skipped as requested."
  } else {
    $outPath = Join-Path $jobDir "music_suno.wav"
    $env:SUNO_TOKEN = $sunoToken
    try {
      & $sunoCli generate --prompt $musicPrompt.text --out $outPath | Out-Null
      $artifacts.music_audio_path_txt = Write-Text (Join-Path $jobDir "music_audio_path.txt") $outPath
    } catch {
      $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") ("Suno generate failed; skipped. (" + $_.Exception.GetType().Name + ")")
    }
  }
}

# Analyze reference background music and provide Suno prompt (optional)
$refAudioAnalysisObj = $null
if ($AnalyzeRefMusic) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) {
    $artifacts.ref_music_notes_txt = Write-Text (Join-Path $jobDir "ref_music_notes.txt") "ffmpeg not found; cannot analyze reference music."
  } else {
    $refSource = $null
    $musicPathFile = Join-Path $jobDir "music_audio_path.txt"
    if (Test-Path -LiteralPath $musicPathFile) {
      $p = (Get-Content -LiteralPath $musicPathFile -Raw -Encoding UTF8).Trim()
      if ($p -and (Test-Path -LiteralPath $p)) { $refSource = $p }
    }
    if (-not $refSource) { $refSource = $Video } # fallback to extracting from video

    try {
      $refWav = Join-Path $jobDir "ref_music.wav"
      if ($refSource -eq $Video) {
        Extract-RefAudioWav $Video $refWav $RefAnalyzeSeconds | Out-Null
      } else {
        # If refSource is already an audio file, normalize to wav for analysis.
        $tSec = [Math]::Max(5,$RefAnalyzeSeconds)
        Invoke-FFmpegCapture @(
          "-hide_banner","-y",
          "-i",[string]$refSource,
          "-ac","1",
          "-ar","48000",
          "-t",[string]$tSec,
          [string]$refWav
        ) | Out-Null
        if (-not (Test-Path -LiteralPath $refWav)) { throw "Failed to convert reference audio to wav." }
      }

      $audioAnalysis = Analyze-AudioWithFfmpeg $refWav
      $refAudioAnalysisObj = $audioAnalysis
      $artifacts.ref_music_source_txt = Write-Text (Join-Path $jobDir "ref_music_source.txt") $refSource
      $artifacts.ref_music_wav = $refWav
      $artifacts.ref_music_analysis_json = Write-Json (Join-Path $jobDir "ref_music_analysis.json") $audioAnalysis

      $sunoPrompt = Build-SunoPromptFromReference $musicPrompt.text $audioAnalysis $analysis.video_type
      $artifacts.ref_music_suno_prompt_txt = Write-Text (Join-Path $jobDir "ref_music_suno_prompt.txt") $sunoPrompt
    } catch {
      $artifacts.ref_music_notes_txt = Write-Text (Join-Path $jobDir "ref_music_notes.txt") (($_ | Out-String).Trim())
    }
  }
}

# Viral edit analysis: compare audio energy peaks vs scene cuts; generate report + Suno prompt.
$viralReportObj = $null
if ($AnalyzeViralEdit) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) {
    $artifacts.viral_notes_txt = Write-Text (Join-Path $jobDir "viral_notes.txt") "ffmpeg not found; cannot run viral edit analysis."
  } else {
    try {
      $cuts = Detect-SceneCuts $Video $SceneThreshold $RefAnalyzeSeconds
      $peaks = Get-AudioEnergyPeaks $Video $RefAnalyzeSeconds $BeatWindowSec
      $cmp = Compare-CutsToBeats $cuts $peaks $BeatMatchToleranceSec
      $report = Build-ViralReport $analysis $videoInfo $musicPrompt $cuts $peaks $cmp $RefAnalyzeSeconds
      $viralReportObj = $report
      $artifacts.viral_cuts_json = Write-Json (Join-Path $jobDir "viral_cuts.json") $cuts
      $artifacts.viral_peaks_json = Write-Json (Join-Path $jobDir "viral_peaks.json") $peaks
      $artifacts.viral_compare_json = Write-Json (Join-Path $jobDir "viral_compare.json") $cmp
      $artifacts.viral_report_json = Write-Json (Join-Path $jobDir "viral_report.json") $report
      $artifacts.viral_report_md = Write-Text (Join-Path $jobDir "viral_report.md") $report.markdown
      $artifacts.viral_suno_prompt_txt = Write-Text (Join-Path $jobDir "viral_suno_prompt.txt") $report.suno_prompt
    } catch {
      $artifacts.viral_notes_txt = Write-Text (Join-Path $jobDir "viral_notes.txt") (($_ | Out-String).Trim())
    }
  }
}

# Style classification (high_burn / beat_sync / epic_orchestral / edm)
if ($ClassifyStyle -or $AnalyzeViralEdit -or $AnalyzeRefMusic) {
  $style = Classify-EditStyle $analysis $viralReportObj $refAudioAnalysisObj
  $artifacts.style_json = Write-Json (Join-Path $jobDir "style.json") $style
  $artifacts.style_primary_txt = Write-Text (Join-Path $jobDir "style_primary.txt") ($style.primary + " (" + ("{0:P0}" -f $style.confidence) + ")")
}

# Auto music scoring based on content + type + style signals (optional)
if ($AutoMusic) {
  $styleObj = $null
  if ($ClassifyStyle -or $AnalyzeViralEdit -or $AnalyzeRefMusic) { $styleObj = $style }

  # If filename-based type is unknown, lightly bias prompt by motion/tempo.
  $typeForPrompt = $analysis.video_type
  if ($typeForPrompt -eq "unknown" -and $viralReportObj -and $viralReportObj.ok -and $viralReportObj.bpm_est) {
    if ($viralReportObj.bpm_est -ge 135) { $typeForPrompt = "sports" }
  }
  $basePrompt = (Build-MusicPrompt $typeForPrompt).text
  $autoPrompt = Auto-MusicPromptFromSignals $basePrompt $styleObj $contentObj $viralReportObj
  $musicPrompt.text = $autoPrompt
  $artifacts.music_prompt_auto_txt = Write-Text (Join-Path $jobDir "music_prompt_auto.txt") $autoPrompt
  # Keep original file for compatibility but update it to auto prompt.
  $artifacts.music_prompt_txt = Write-Text (Join-Path $jobDir "music_prompt.txt") $autoPrompt
  $artifacts.music_prompt_json = Write-Json (Join-Path $jobDir "music_prompt.json") (@{ video_type=$typeForPrompt } + $musicPrompt)

  # If user chose library music, try re-picking with style tag hints.
  if ($Music -eq "library") {
    if (-not $manifestObj) {
      $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") "No library manifest; skipped."
    } else {
      $want = @()
      if ($typeForPrompt -and $typeForPrompt -ne "unknown") { $want += $typeForPrompt }
      $want += "no_vocals"
      if ($styleObj -and $styleObj.ok -and $styleObj.primary) { $want += [string]$styleObj.primary }

      $cands = Find-LibraryItems $manifestObj "music" $want
      if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "music" @($typeForPrompt,"no_vocals") }
      if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "music" @($typeForPrompt) }
      if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "music" @("no_vocals") }

      if (-not $cands -or $cands.Count -eq 0) {
        $artifacts.music_notes_txt = Write-Text (Join-Path $jobDir "music_notes.txt") "No matching library music found (even after auto-music)."
      } else {
        $rng = [Random]::new($Seed)
        $chosen = Pick-Random $rng $cands
        $p = Resolve-LibraryPath $manifestObj $chosen.path
        $artifacts.music_audio_path_txt = Write-Text (Join-Path $jobDir "music_audio_path.txt") $p
      }
    }
  }
}

# SFX timeline
$timeline = @()
if ($Sfx -ne "none") {
  $rng = [Random]::new($Seed)
  $times = New-SceneGridTimes ([double]$videoInfo.duration_sec) $SceneGridSec
  $timeline += @{ t_sec=[double]$times[0]; kind="sfx"; label="logo_hit"; source=$null; gain_db=-3.0; duration_sec=$null; extra=@{} }
  $tags = Base-SfxTags $analysis.video_type
  $stride = 3
  for ($i = 1; $i -lt $times.Count; $i++) {
    if ($timeline.Count -ge $MaxSfx) { break }
    if (($i % $stride) -ne 0) { continue }
    $tag = Pick-Random $rng $tags
    if (-not $tag) { $tag = "whoosh" }
    $label = ($tag.ToLowerInvariant() -replace "[^a-z0-9]+","_").Trim("_")
    $gain = if ($label.Contains("whoosh")) { -8.0 } else { -6.0 }
    $timeline += @{ t_sec=[double]$times[$i]; kind="sfx"; label=$label; source=$null; gain_db=$gain; duration_sec=$null; extra=@{} }
  }

  if ($manifestObj -and ($Sfx -eq "library_sync" -or $Sfx -eq "hybrid")) {
    foreach ($ev in $timeline) {
      $cands = Find-LibraryItems $manifestObj "sfx" @($ev.label, $analysis.video_type)
      if (-not $cands -or $cands.Count -eq 0) { $cands = Find-LibraryItems $manifestObj "sfx" @($ev.label) }
      if ($cands -and $cands.Count -gt 0) {
        $chosen = Pick-Random $rng $cands
        $ev.source = Resolve-LibraryPath $manifestObj $chosen.path
        $ev.extra.tags = @($chosen.tags)
      }
    }
  }

  if ($Sfx -eq "content_realworld" -or $Sfx -eq "hybrid") {
    foreach ($ev in $timeline) {
      if (-not $ev.extra) { $ev.extra = @{} }
      $ev.extra.content_refine = $true
      $ev.extra.analysis_cues = $analysis
    }
  }
}

$artifacts.timeline_json = Write-Json (Join-Path $jobDir "timeline.json") $timeline

# Render / mux back to video (ffmpeg)
if ($Render) {
  $ffmpeg = Get-FFmpegPath
  if (-not $ffmpeg) {
    $artifacts.render_notes_txt = Write-Text (Join-Path $jobDir "render_notes.txt") "ffmpeg not found. Ensure ffmpeg.exe is in PATH, in the script folder, or set env:FFMPEG, then rerun with -Render."
  } else {
    $duration = [double]$videoInfo.duration_sec
    if (-not $OutputVideo) {
      $base = [IO.Path]::GetFileNameWithoutExtension($Video)
      $OutputVideo = (Join-Path $jobDir ($base + ".mixed.mp4"))
    }

    $inputs = New-Object System.Collections.Generic.List[object]
    $loopFlags = New-Object System.Collections.Generic.List[object]

    # Base input 0: video
    $inputs.Add(@("-i", $Video)) | Out-Null

    $baseAudioIndex = 0
    $hasAudio = $videoInfo.has_audio
    if ($hasAudio -eq $false) {
      if ($duration -le 0) {
        # Last resort: re-probe via ffmpeg parse.
        $p2 = Probe-Video $Video
        $duration = [double]$p2.duration_sec
      }
      $tArgs = @()
      if ($duration -gt 0) { $tArgs = @("-t", [string]([Math]::Ceiling($duration))) }
      $inputs.Add(@("-f", "lavfi") + $tArgs + @("-i", "anullsrc=channel_layout=stereo:sample_rate=48000")) | Out-Null
      $baseAudioIndex = 1
    }

    $audioInputIndices = New-Object System.Collections.Generic.List[int]
    $labels = New-Object System.Collections.Generic.List[string]
    $filterParts = New-Object System.Collections.Generic.List[string]

    # Base
    $filterParts.Add(("[{0}:a]aresample=async=1:first_pts=0[base]" -f $baseAudioIndex)) | Out-Null
    $audioInputIndices.Add($baseAudioIndex) | Out-Null
    $labels.Add("[base]") | Out-Null

    # Music input (optional)
    $musicPath = $null
    $musicPathFile = Join-Path $jobDir "music_audio_path.txt"
    if (Test-Path -LiteralPath $musicPathFile) {
      $musicPath = (Get-Content -LiteralPath $musicPathFile -Raw -Encoding UTF8).Trim()
      if (-not (Test-Path -LiteralPath $musicPath)) { $musicPath = $null }
    }
    if ($musicPath) {
      $inputs.Add(@("-stream_loop","-1","-i",$musicPath)) | Out-Null
      $musicIndex = $baseAudioIndex + 1
      $musicVol = [Math]::Pow(10.0, ($MusicGainDb / 20.0))
      if ($duration -gt 0) {
        $filterParts.Add(("[{0}:a]aresample=async=1:first_pts=0,atrim=0:{1},volume={2}[music]" -f $musicIndex, $duration, $musicVol)) | Out-Null
      } else {
        $filterParts.Add(("[{0}:a]aresample=async=1:first_pts=0,volume={1}[music]" -f $musicIndex, $musicVol)) | Out-Null
      }
      $labels.Add("[music]") | Out-Null
    }

    # SFX inputs (optional, requires source paths in timeline)
    $sfxCount = 0
    foreach ($ev in $timeline) {
      if ($sfxCount -ge $MaxSfx) { break }
      if (-not $ev.source) { continue }
      if (-not (Test-Path -LiteralPath $ev.source)) { continue }
      $inputs.Add(@("-i", [string]$ev.source)) | Out-Null
      $idx = $baseAudioIndex + 1 + ($(if ($musicPath) { 1 } else { 0 })) + $sfxCount
      $delayMs = [int]([Math]::Round(([double]$ev.t_sec) * 1000.0))
      $gainDb = [double]$ev.gain_db
      $vol = [Math]::Pow(10.0, ($gainDb / 20.0))
      $lab = "sfx{0}" -f $sfxCount
      $filterParts.Add(("[{0}:a]aresample=async=1:first_pts=0,adelay={1}:all=1,volume={2}[{3}]" -f $idx, $delayMs, $vol, $lab)) | Out-Null
      $labels.Add("[{0}]" -f $lab) | Out-Null
      $sfxCount++
    }

    $mixInputs = $labels.Count
    $mixLabelList = ($labels -join "")
    $mixTail = ""
    if ($duration -gt 0) {
      $mixTail = ",atrim=0:{0}" -f $duration
    }
    $filterParts.Add(("{0}amix=inputs={1}:normalize=0{2}[aout]" -f $mixLabelList, $mixInputs, $mixTail)) | Out-Null

    $filter = ($filterParts -join ";")
    $args = New-Object System.Collections.Generic.List[object]
    foreach ($chunk in $inputs) { foreach ($x in $chunk) { $args.Add($x) | Out-Null } }
    $args.AddRange(@("-filter_complex", $filter)) | Out-Null
    $args.AddRange(@("-map","0:v:0","-map","[aout]","-c:v","copy","-c:a","aac","-b:a","192k","-shortest","-y",$OutputVideo)) | Out-Null

    $artifacts.render_command_txt = Write-Text (Join-Path $jobDir "render_ffmpeg_args.txt") ($args -join " ")
    try {
      & $ffmpeg @args | Out-Null
      if ($LASTEXITCODE -eq 0) {
        $artifacts.output_video = $OutputVideo
      } else {
        $artifacts.render_notes_txt = Write-Text (Join-Path $jobDir "render_notes.txt") ("ffmpeg failed with exit code " + $LASTEXITCODE)
      }
    } catch {
      $artifacts.render_notes_txt = Write-Text (Join-Path $jobDir "render_notes.txt") ("ffmpeg exception: " + $_.Exception.GetType().Name)
    }
  }
}

# Optional: export report to Excel-friendly file named audio_report_xxxx.*
if ($ReportExcel) {
  $stem = Sanitize-FileStem ([IO.Path]::GetFileName($Video))
  $baseName = "audio_report_{0}" -f $stem
  $dir = $jobDir

  $rows = @()
  $rows += [pscustomobject]@{ section="meta"; key="video"; value=$Video }
  $rows += [pscustomobject]@{ section="meta"; key="video_type"; value=$analysis.video_type }
  $rows += [pscustomobject]@{ section="meta"; key="duration_sec"; value=$videoInfo.duration_sec }
  $rows += [pscustomobject]@{ section="meta"; key="ffmpeg_status"; value=$ffTools.status }

  $contentJson = Join-Path $jobDir "content.json"
  if (Test-Path -LiteralPath $contentJson) {
    $cj = Read-Json $contentJson
    $rows += [pscustomobject]@{ section="content"; key="motion_score"; value=$cj.motion_score }
    $rows += [pscustomobject]@{ section="content"; key="brightness_avg"; value=$cj.brightness_avg }
    $rows += [pscustomobject]@{ section="content"; key="brightness_std"; value=$cj.brightness_std }
  }

  $refPromptFile = Join-Path $jobDir "ref_music_suno_prompt.txt"
  if (Test-Path -LiteralPath $refPromptFile) {
    $rows += [pscustomobject]@{ section="ref_music"; key="suno_prompt"; value=(Get-Content -LiteralPath $refPromptFile -Raw -Encoding UTF8).Trim() }
  }
  $viralJson = Join-Path $jobDir "viral_report.json"
  if (Test-Path -LiteralPath $viralJson) {
    $vj = Read-Json $viralJson
    $rows += [pscustomobject]@{ section="viral"; key="analyze_seconds"; value=$vj.analyze_seconds }
    $rows += [pscustomobject]@{ section="viral"; key="cut_count"; value=$vj.cut_count }
    $rows += [pscustomobject]@{ section="viral"; key="cut_rate_per_sec"; value=$vj.cut_rate_per_sec }
    $rows += [pscustomobject]@{ section="viral"; key="bpm_est"; value=$vj.bpm_est }
    $rows += [pscustomobject]@{ section="viral"; key="beat_match_rate"; value=$vj.beat_match_rate }
    $rows += [pscustomobject]@{ section="viral"; key="suno_prompt"; value=$vj.suno_prompt }
  }
  $styleJson = Join-Path $jobDir "style.json"
  if (Test-Path -LiteralPath $styleJson) {
    $sj = Read-Json $styleJson
    $rows += [pscustomobject]@{ section="style"; key="primary"; value=$sj.primary }
    $rows += [pscustomobject]@{ section="style"; key="confidence"; value=$sj.confidence }
    $rows += [pscustomobject]@{ section="style"; key="labels"; value=(@($sj.labels) -join ",") }
  }

  if ($ReportFormat -eq "xlsx") {
    $xlsx = Join-Path $dir ($baseName + ".xlsx")
    $ok = $false
    $mod = Get-Module -ListAvailable -Name ImportExcel | Select-Object -First 1
    if ($mod) {
      try {
        Import-Module ImportExcel -ErrorAction Stop
        $rows | Export-Excel -Path $xlsx -WorksheetName "audio_report" -AutoSize -FreezeTopRow
        $ok = $true
      } catch { $ok = $false }
    }
    if ($ok) {
      $artifacts.report_xlsx = $xlsx
    } else {
      $csv = Join-Path $dir ($baseName + ".csv")
      $rows | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
      $artifacts.report_csv = $csv
      $artifacts.report_excel_notes_txt = Write-Text (Join-Path $jobDir "report_excel_notes.txt") "XLSX export needs ImportExcel module. Fell back to CSV."
    }
  } else {
    $csv = Join-Path $dir ($baseName + ".csv")
    $rows | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
    $artifacts.report_csv = $csv
  }
}

# Example manifest
if ($Assets) {
  $example = Join-Path $Assets "library_manifest.example.json"
  if (-not (Test-Path -LiteralPath $example)) {
    $obj = @{
      root = ".\\assets"
      items = @(
        @{ kind="music"; path="music\\travel_chill_01.wav"; tags=@("travel","chill","no_vocals") }
        @{ kind="music"; path="music\\gaming_hype_01.wav"; tags=@("gaming","edm","no_vocals") }
        @{ kind="sfx"; path="sfx\\foley\\whoosh_01.wav"; tags=@("whoosh","transition") }
        @{ kind="sfx"; path="sfx\\real_world\\knife_chop_01.wav"; tags=@("knife","chop","cooking") }
      )
    }
    $artifacts.library_manifest_example_json = Write-Json $example $obj
  }
}

$artifacts | ConvertTo-Json -Depth 10
