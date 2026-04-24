param(
  [ValidateSet('preflight', 'staging-release', 'prod-release', 'post-release')]
  [string]$Mode = 'preflight',
  [string]$RunId = '',
  [ValidateSet('staging', 'prod')]
  [string]$Target = 'staging',
  [string]$ExpectedUpdatedBy = '',
  [string[]]$AllowDirtyScope = @(),
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Script:Blockers = New-Object System.Collections.Generic.List[string]
$Script:Warnings = New-Object System.Collections.Generic.List[string]
$Script:Checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )
  $Script:Checks.Add([pscustomobject]@{
      Name   = $Name
      Status = $Status
      Detail = $Detail
    })
}

function Add-Blocker {
  param([string]$Message)
  $Script:Blockers.Add($Message)
}

function Add-Warning {
  param([string]$Message)
  $Script:Warnings.Add($Message)
}

function Invoke-Git {
  param([string[]]$GitArgs)
  $gitArgs = $GitArgs
  $output = & git @gitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($gitArgs -join ' ') failed: $output"
  }
  return ($output | Out-String).Trim()
}

function Invoke-ProcessChecked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )
  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Test-ShaMatch {
  param(
    [string]$Left,
    [string]$Right
  )
  if ([string]::IsNullOrWhiteSpace($Left) -or [string]::IsNullOrWhiteSpace($Right)) {
    return $false
  }
  return $Left.StartsWith($Right) -or $Right.StartsWith($Left)
}

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
}

function Get-ActiveRunPath {
  param([string]$RepoRoot)
  $runsRoot = Join-Path $RepoRoot 'docs\workflow\runs'
  if (-not (Test-Path $runsRoot)) {
    return $null
  }

  if (-not [string]::IsNullOrWhiteSpace($RunId)) {
    $candidate = Join-Path $runsRoot $RunId
    if (Test-Path $candidate) {
      return $candidate
    }
    Add-Blocker "Run directory not found: $RunId"
    return $null
  }

  $latest = Get-ChildItem -Path $runsRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -ne $latest) {
    Add-Warning "RunId not provided. Using latest run directory: $($latest.Name)"
    return $latest.FullName
  }
  return $null
}

function Get-DirtyPaths {
  param([string]$RepoRoot)
  $status = Invoke-Git -GitArgs @('status', '--short')
  if ([string]::IsNullOrWhiteSpace($status)) {
    return @()
  }
  $paths = @()
  foreach ($line in ($status -split "`r?`n")) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $candidate = if ($line.Length -ge 4) { $line.Substring(3).Trim() } else { $line.Trim() }
    if ($candidate.Contains(' -> ')) {
      $candidate = $candidate.Split(' -> ')[1].Trim()
    }
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      $paths += ($candidate -replace '\\', '/')
    }
  }
  return $paths
}

function Test-IsReleaseBlockingPath {
  param([string]$Path)

  $ignoredPrefixes = @(
    'scripts/ops/archive/',
    'tmp_server_ronin_check/'
  )
  foreach ($prefix in $ignoredPrefixes) {
    if ($Path.StartsWith($prefix)) {
      return $false
    }
  }

  $blockingPrefixes = @(
    'h5-video-tool/',
    'h5-video-tool-api/'
  )
  foreach ($prefix in $blockingPrefixes) {
    if ($Path.StartsWith($prefix)) {
      return $true
    }
  }

  $blockingExact = @(
    'scripts/deploy_all.py',
    'scripts/deploy_api.py',
    'scripts/deploy_frontend.py',
    'scripts/deploy_config.py',
    'scripts/set_deployment_state.py',
    'scripts/mark_release_ready.py',
    'scripts/release_guard.py'
  )
  return $blockingExact -contains $Path
}

function Test-IsAllowedDirtyPath {
  param([string]$Path)
  foreach ($scope in $AllowDirtyScope) {
    $normalized = ($scope -replace '\\', '/').Trim()
    if ([string]::IsNullOrWhiteSpace($normalized)) {
      continue
    }
    if ($Path.StartsWith($normalized)) {
      return $true
    }
  }
  return $false
}

function Get-VersionUrlForTarget {
  param([string]$ReleaseTarget)
  switch ($ReleaseTarget) {
    'staging' { return 'http://43.134.186.196:8080/api/system/version' }
    'prod' { return 'http://43.134.186.196/api/system/version' }
    default { throw "Unsupported target: $ReleaseTarget" }
  }
}

function Get-VersionPayload {
  param([string]$Url)
  try {
    return Invoke-RestMethod -Method Get -Uri $Url -Headers @{ 'User-Agent' = 'gobs-release-guard/0.1' } -TimeoutSec 20
  }
  catch {
    Add-Warning "Failed to read version endpoint: $Url"
    return $null
  }
}

function Get-VerifiedStagingSha {
  param([string]$RepoRoot)
  $code = "from scripts.deploy_all import get_verified_staging_sha; print(get_verified_staging_sha())"
  Push-Location $RepoRoot
  try {
    $output = & python -c $code 2>&1
    if ($LASTEXITCODE -ne 0) {
      Add-Warning "Could not read verified staging SHA via scripts.deploy_all: $output"
      return ''
    }
    return ($output | Out-String).Trim()
  }
  finally {
    Pop-Location
  }
}

function Test-FileRequired {
  param(
    [string]$Path,
    [string]$Label,
    [bool]$Required
  )
  if (Test-Path $Path) {
    Add-Check -Name $Label -Status 'PASS' -Detail 'present'
    return
  }
  if ($Required) {
    Add-Check -Name $Label -Status 'FAIL' -Detail 'missing'
    Add-Blocker "Missing required artifact: $Label"
  }
  else {
    Add-Check -Name $Label -Status 'WARN' -Detail 'missing'
    Add-Warning "Missing recommended artifact: $Label"
  }
}

$repoRoot = Get-RepoRoot
Push-Location $repoRoot
try {
  $branch = Invoke-Git -GitArgs @('branch', '--show-current')
  $headSha = Invoke-Git -GitArgs @('rev-parse', 'HEAD')
  $headShort = Invoke-Git -GitArgs @('rev-parse', '--short', 'HEAD')
  $containsMain = Invoke-Git -GitArgs @('branch', '--remotes', '--contains', 'HEAD')
  $aheadBehind = Invoke-Git -GitArgs @('rev-list', '--left-right', '--count', 'origin/main...HEAD')
  $dirtyPaths = Get-DirtyPaths -RepoRoot $repoRoot

  Add-Check -Name 'Branch' -Status 'INFO' -Detail $branch
  Add-Check -Name 'HEAD' -Status 'INFO' -Detail $headShort
  Add-Check -Name 'origin/main relation' -Status 'INFO' -Detail $aheadBehind

  if (($Mode -eq 'staging-release') -or ($Mode -eq 'prod-release') -or ($Mode -eq 'post-release')) {
    if (-not (($containsMain -split "`r?`n") | Where-Object { $_.Trim() -eq 'origin/main' })) {
      Add-Blocker 'HEAD is not contained in origin/main.'
      Add-Check -Name 'origin/main containment' -Status 'FAIL' -Detail 'HEAD not found in origin/main'
    }
    else {
      Add-Check -Name 'origin/main containment' -Status 'PASS' -Detail 'HEAD reachable from origin/main'
    }
  }
  else {
    if (-not (($containsMain -split "`r?`n") | Where-Object { $_.Trim() -eq 'origin/main' })) {
      Add-Warning 'HEAD is not yet contained in origin/main.'
      Add-Check -Name 'origin/main containment' -Status 'WARN' -Detail 'HEAD not found in origin/main'
    }
    else {
      Add-Check -Name 'origin/main containment' -Status 'PASS' -Detail 'HEAD reachable from origin/main'
    }
  }

  $blockingDirty = @()
  $warningDirty = @()
  foreach ($path in $dirtyPaths) {
    if (Test-IsAllowedDirtyPath -Path $path) {
      $warningDirty += $path
      continue
    }
    if (Test-IsReleaseBlockingPath -Path $path) {
      $blockingDirty += $path
    }
    else {
      $warningDirty += $path
    }
  }

  if ($blockingDirty.Count -gt 0) {
    Add-Blocker ("Release-scope dirty files detected: " + ($blockingDirty -join ', '))
    Add-Check -Name 'Dirty working tree' -Status 'FAIL' -Detail ($blockingDirty -join ', ')
  }
  elseif ($warningDirty.Count -gt 0) {
    Add-Warning ("Non-blocking dirty files present: " + ($warningDirty -join ', '))
    Add-Check -Name 'Dirty working tree' -Status 'WARN' -Detail ($warningDirty -join ', ')
  }
  else {
    Add-Check -Name 'Dirty working tree' -Status 'PASS' -Detail 'clean'
  }

  $runPath = Get-ActiveRunPath -RepoRoot $repoRoot
  if ($null -ne $runPath) {
    $runName = Split-Path -Leaf $runPath
    Add-Check -Name 'Active run' -Status 'INFO' -Detail $runName

    $requireBuilder = $Mode -eq 'prod-release'
    $requireVerifier = $Mode -eq 'prod-release'
    $requireReleaseDecision = ($Mode -eq 'prod-release') -or ($Mode -eq 'post-release')

    Test-FileRequired -Path (Join-Path $runPath 'SESSION-ANCHOR.md') -Label 'SESSION-ANCHOR.md' -Required $true
    Test-FileRequired -Path (Join-Path $runPath 'planner-spec.md') -Label 'planner-spec.md' -Required $true
    Test-FileRequired -Path (Join-Path $runPath 'challenger-review.md') -Label 'challenger-review.md' -Required $false
    Test-FileRequired -Path (Join-Path $runPath 'builder-report.md') -Label 'builder-report.md' -Required $requireBuilder
    Test-FileRequired -Path (Join-Path $runPath 'verifier-report.md') -Label 'verifier-report.md' -Required $requireVerifier
    Test-FileRequired -Path (Join-Path $runPath 'release-decision.md') -Label 'release-decision.md' -Required $requireReleaseDecision
  }
  else {
    Add-Warning 'No active run directory was resolved.'
    Add-Check -Name 'Active run' -Status 'WARN' -Detail 'not resolved'
  }

  $productPath = Join-Path $repoRoot 'PRODUCT.md'
  if (Test-Path $productPath) {
    Add-Check -Name 'PRODUCT.md' -Status 'PASS' -Detail 'present'
  }
  else {
    Add-Blocker 'PRODUCT.md is missing.'
    Add-Check -Name 'PRODUCT.md' -Status 'FAIL' -Detail 'missing'
  }

  $changelogPath = Join-Path $repoRoot 'CHANGELOG.md'
  if (Test-Path $changelogPath) {
    Add-Check -Name 'CHANGELOG.md' -Status 'PASS' -Detail 'present'
  }
  else {
    Add-Warning 'CHANGELOG.md is not present yet; PRODUCT.md must cover release notes.'
    Add-Check -Name 'CHANGELOG.md' -Status 'WARN' -Detail 'not present'
  }

  if (-not $SkipBuild) {
    try {
      Invoke-ProcessChecked -FilePath 'npx' -Arguments @('tsc', '--noEmit') -WorkingDirectory (Join-Path $repoRoot 'h5-video-tool-api')
      Add-Check -Name 'Backend typecheck' -Status 'PASS' -Detail 'npx tsc --noEmit'
    }
    catch {
      Add-Blocker "Backend typecheck failed: $_"
      Add-Check -Name 'Backend typecheck' -Status 'FAIL' -Detail "$_"
    }

    try {
      Invoke-ProcessChecked -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory (Join-Path $repoRoot 'h5-video-tool-api')
      Add-Check -Name 'Backend build' -Status 'PASS' -Detail 'npm run build'
    }
    catch {
      Add-Blocker "Backend build failed: $_"
      Add-Check -Name 'Backend build' -Status 'FAIL' -Detail "$_"
    }

    try {
      Invoke-ProcessChecked -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory (Join-Path $repoRoot 'h5-video-tool')
      Add-Check -Name 'Frontend build' -Status 'PASS' -Detail 'npm run build'
    }
    catch {
      Add-Blocker "Frontend build failed: $_"
      Add-Check -Name 'Frontend build' -Status 'FAIL' -Detail "$_"
    }
  }
  else {
    Add-Warning 'Build checks were skipped.'
    Add-Check -Name 'Build checks' -Status 'WARN' -Detail 'skipped by flag'
  }

  $targetVersionUrl = Get-VersionUrlForTarget -ReleaseTarget $Target
  $targetVersion = Get-VersionPayload -Url $targetVersionUrl
  if ($null -ne $targetVersion) {
    $remoteShort = [string]($targetVersion.commitShort)
    $remoteEnv = [string]($targetVersion.environment)
    Add-Check -Name "$Target live version" -Status 'INFO' -Detail "$remoteEnv @ $remoteShort"
  }

  if ($Mode -eq 'prod-release') {
    $stagingVersion = Get-VersionPayload -Url (Get-VersionUrlForTarget -ReleaseTarget 'staging')
    $verifiedStagingSha = Get-VerifiedStagingSha -RepoRoot $repoRoot

    if ($null -eq $stagingVersion) {
      Add-Blocker 'Unable to read staging live version for prod promotion checks.'
      Add-Check -Name 'Staging live version' -Status 'FAIL' -Detail 'unavailable'
    }
    else {
      $stagingShort = [string]($stagingVersion.commitShort)
      Add-Check -Name 'Staging live version' -Status 'INFO' -Detail $stagingShort
      if (-not (Test-ShaMatch -Left $headShort -Right $stagingShort)) {
        Add-Blocker "Local HEAD $headShort does not match staging live version $stagingShort."
      }
    }

    if ([string]::IsNullOrWhiteSpace($verifiedStagingSha)) {
      Add-Blocker 'Verified staging SHA is missing or unreadable.'
      Add-Check -Name 'Verified staging SHA' -Status 'FAIL' -Detail 'missing'
    }
    else {
      Add-Check -Name 'Verified staging SHA' -Status 'INFO' -Detail $verifiedStagingSha
      if (-not (Test-ShaMatch -Left $headShort -Right $verifiedStagingSha)) {
        Add-Blocker "Local HEAD $headShort does not match verified staging SHA $verifiedStagingSha."
      }
    }
  }

  $decision = if ($Script:Blockers.Count -gt 0) {
    'NO-GO'
  }
  elseif ($Script:Warnings.Count -gt 0) {
    'GO WITH WARNINGS'
  }
  else {
    'GO'
  }

  Write-Host ''
  Write-Host '=== Release Guard Summary ==='
  Write-Host "Mode: $Mode"
  Write-Host "Target: $Target"
  Write-Host "Branch: $branch"
  Write-Host "HEAD: $headShort"
  if (-not [string]::IsNullOrWhiteSpace($ExpectedUpdatedBy)) {
    Write-Host "updated_by: $ExpectedUpdatedBy"
  }
  if ($null -ne $runPath) {
    Write-Host "Run: $(Split-Path -Leaf $runPath)"
  }
  Write-Host ''
  foreach ($check in $Script:Checks) {
    Write-Host ("[{0}] {1}: {2}" -f $check.Status, $check.Name, $check.Detail)
  }

  if ($Script:Warnings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Warnings:'
    foreach ($warning in $Script:Warnings) {
      Write-Host "- $warning"
    }
  }

  if ($Script:Blockers.Count -gt 0) {
    Write-Host ''
    Write-Host 'Blockers:'
    foreach ($blocker in $Script:Blockers) {
      Write-Host "- $blocker"
    }
  }

  Write-Host ''
  Write-Host "Decision: $decision"

  switch ($decision) {
    'NO-GO' {
      Write-Host 'Next: fix blockers and rerun release guard.'
      exit 1
    }
    'GO WITH WARNINGS' {
      Write-Host 'Next: review warnings, then continue with the intended release step.'
      exit 0
    }
    default {
      Write-Host 'Next: continue with the intended release step.'
      exit 0
    }
  }
}
finally {
  Pop-Location
}
