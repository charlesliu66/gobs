param(
  [ValidateSet('local', 'staging', 'prod')]
  [string]$Env = 'staging',
  [ValidateSet('quick', 'full')]
  [string]$Depth = 'quick',
  [string]$BaseUrl = '',
  [string]$ApiUrl = '',
  [string]$ExpectedCommit = '',
  [string]$RunId = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Script:Failures = New-Object System.Collections.Generic.List[string]
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

function Add-Failure {
  param([string]$Message)
  $Script:Failures.Add($Message)
}

function Add-Warning {
  param([string]$Message)
  $Script:Warnings.Add($Message)
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

function Get-DefaultTargets {
  param([string]$ResolvedEnv)
  switch ($ResolvedEnv) {
    'local' {
      return @{
        BaseUrl = 'http://127.0.0.1:5173'
        ApiUrl  = 'http://127.0.0.1:3001'
      }
    }
    'staging' {
      return @{
        BaseUrl = 'http://43.134.186.196:8080'
        ApiUrl  = 'http://43.134.186.196:8080'
      }
    }
    'prod' {
      return @{
        BaseUrl = 'http://43.134.186.196'
        ApiUrl  = 'http://43.134.186.196'
      }
    }
    default {
      throw "Unsupported env: $ResolvedEnv"
    }
  }
}

function Invoke-HttpCheck {
  param(
    [string]$Url,
    [string]$Label
  )
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers @{ 'User-Agent' = 'gobs-h5-smoke/0.1' } -TimeoutSec 20
    Add-Check -Name $Label -Status 'PASS' -Detail ("HTTP {0}" -f [int]$response.StatusCode)
    return $response
  }
  catch {
    $message = $_.Exception.Message
    Add-Check -Name $Label -Status 'FAIL' -Detail $message
    Add-Failure "$Label failed: $message"
    return $null
  }
}

$targets = Get-DefaultTargets -ResolvedEnv $Env
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = $targets.BaseUrl
}
if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
  $ApiUrl = $targets.ApiUrl
}

$versionUrl = ($ApiUrl.TrimEnd('/')) + '/api/system/version'
$routesQuick = @(
  '/',
  '/studio/production',
  '/quickfilm',
  '/history'
)
$routesFullExtra = @(
  '/gallery',
  '/asset-library',
  '/distribute'
)

Add-Check -Name 'Environment' -Status 'INFO' -Detail $Env
Add-Check -Name 'BaseUrl' -Status 'INFO' -Detail $BaseUrl
Add-Check -Name 'ApiUrl' -Status 'INFO' -Detail $ApiUrl
if (-not [string]::IsNullOrWhiteSpace($RunId)) {
  Add-Check -Name 'RunId' -Status 'INFO' -Detail $RunId
}

$rootResponse = Invoke-HttpCheck -Url $BaseUrl -Label 'Frontend root'
$versionResponse = Invoke-HttpCheck -Url $versionUrl -Label 'Version endpoint'

if ($null -ne $versionResponse) {
  try {
    $versionPayload = $versionResponse.Content | ConvertFrom-Json
    $commitShort = [string]$versionPayload.commitShort
    $commitSha = [string]$versionPayload.commitSha
    $environment = [string]$versionPayload.environment

    $resolvedCommit = if (-not [string]::IsNullOrWhiteSpace($commitShort)) { $commitShort } else { $commitSha }
    Add-Check -Name 'Version payload' -Status 'PASS' -Detail ("{0} @ {1}" -f $environment, $resolvedCommit)

    if (($Env -ne 'local') -and (-not [string]::IsNullOrWhiteSpace($environment))) {
      if ($environment.Trim().ToLowerInvariant() -ne $Env) {
        Add-Failure "Environment marker mismatch: expected $Env but got $environment"
        Add-Check -Name 'Environment marker' -Status 'FAIL' -Detail $environment
      }
      else {
        Add-Check -Name 'Environment marker' -Status 'PASS' -Detail $environment
      }
    }
    elseif ($Env -ne 'local') {
      Add-Warning 'Version payload did not include an environment marker.'
      Add-Check -Name 'Environment marker' -Status 'WARN' -Detail 'missing'
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedCommit)) {
      if (Test-ShaMatch -Left $ExpectedCommit -Right $resolvedCommit) {
        Add-Check -Name 'Expected commit' -Status 'PASS' -Detail $resolvedCommit
      }
      else {
        Add-Failure "Expected commit $ExpectedCommit does not match deployed commit $resolvedCommit"
        Add-Check -Name 'Expected commit' -Status 'FAIL' -Detail $resolvedCommit
      }
    }
  }
  catch {
    Add-Failure "Could not parse version payload: $($_.Exception.Message)"
    Add-Check -Name 'Version payload' -Status 'FAIL' -Detail $_.Exception.Message
  }
}

foreach ($route in $routesQuick) {
  $url = ($BaseUrl.TrimEnd('/')) + $route
  [void](Invoke-HttpCheck -Url $url -Label ("Route $route"))
}

if ($Depth -eq 'full') {
  foreach ($route in $routesFullExtra) {
    $url = ($BaseUrl.TrimEnd('/')) + $route
    [void](Invoke-HttpCheck -Url $url -Label ("Route $route"))
  }
  Add-Warning 'Full smoke still requires manual follow-up checks for page behavior.'
}

$result = if ($Script:Failures.Count -gt 0) {
  'FAIL'
}
elseif ($Script:Warnings.Count -gt 0) {
  'PASS WITH WARNINGS'
}
else {
  'PASS'
}

Write-Host ''
Write-Host '=== Smoke Test Report ==='
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

if ($Script:Failures.Count -gt 0) {
  Write-Host ''
  Write-Host 'Failures:'
  foreach ($failure in $Script:Failures) {
    Write-Host "- $failure"
  }
}

if ($Depth -eq 'full') {
  Write-Host ''
  Write-Host 'Manual follow-up checklist:'
  Write-Host '- Open Advanced Production.'
  Write-Host '- Open QuickFilm.'
  Write-Host '- Open History or Gallery.'
  Write-Host '- Open Asset Library.'
  Write-Host '- Open Distribute.'
}

Write-Host ''
Write-Host "Result: $result"

if ($result -eq 'FAIL') {
  exit 1
}
exit 0
