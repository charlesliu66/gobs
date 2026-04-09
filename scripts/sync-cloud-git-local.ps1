param(
    [string]$ServerHost = "49.235.61.68",
    [string]$User = "ubuntu",
    [string]$EnvPath = ".\h5-video-tool-api\.env",
    [string]$LocalRepo = ".",
    [string]$RemoteRepoHint = "/home/ubuntu/gobs",
    [switch]$CloudFirstSnapshotFallback
)

$ErrorActionPreference = "Stop"

function Invoke-Step([string]$Text) {
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

$root = Resolve-Path $LocalRepo
Set-Location $root

Invoke-Step "1) Cloud first: try remote git push"
$helper = Join-Path $root "scripts\cloud_sync_helper.py"
if (-not (Test-Path $helper)) {
    throw "Missing helper script: $helper"
}
if (-not (Test-Path $EnvPath)) {
    throw "Missing env file: $EnvPath"
}

$repoCandidates = @($RemoteRepoHint, "/home/$User/app", "/home/$User/project")
$syncRaw = python "$helper" --mode sync-git --host $ServerHost --user $User --env "$EnvPath" --repo-candidates $repoCandidates 2>&1
$syncText = ($syncRaw | Out-String).Trim()
Write-Host $syncText

$remoteSha = $null
$remoteBranch = $null
$remoteOk = $false
try {
    $syncJson = $syncText | ConvertFrom-Json
    if ($syncJson.ok -eq $true) {
        $remoteOk = $true
        $remoteSha = $syncJson.SHA
        $remoteBranch = $syncJson.BRANCH
    }
} catch {
    # fall through
}

if (-not $remoteOk) {
    if ($CloudFirstSnapshotFallback) {
        Invoke-Step "2) Non-git cloud: snapshot frontend/backend to local"
        $snapshotDir = Join-Path $root "deploy\cloud-baseline\frontend"
        if (Test-Path $snapshotDir) { Remove-Item -Recurse -Force $snapshotDir }
        $backendSnapshotDir = Join-Path $root "deploy\cloud-baseline\backend-dist"
        if (Test-Path $backendSnapshotDir) { Remove-Item -Recurse -Force $backendSnapshotDir }
        $snapRaw = python "$helper" --mode snapshot-deploy --host $ServerHost --user $User --env "$EnvPath" --remote-frontend "/home/$User/gobs/frontend" --remote-backend-dist "/home/$User/gobs/backend/dist" --local-snapshot-dir "$snapshotDir" 2>&1
        $snapText = ($snapRaw | Out-String).Trim()
        Write-Host $snapText
    } else {
        throw "No git repo found on cloud. Use -CloudFirstSnapshotFallback."
    }
} else {
    Invoke-Step "2) Local sync to cloud SHA (stash/pull/pop)"
    git stash push -u -m "auto-stash-before-cloud-sync"
    git pull origin $remoteBranch
    git stash pop

    Invoke-Step "3) Verify local and cloud SHA"
    $localSha = (git rev-parse HEAD).Trim()
    Write-Host "cloud: $remoteSha"
    Write-Host "local: $localSha"
    if ($localSha -ne $remoteSha) {
        throw "SHA mismatch: local not aligned to cloud"
    }
}

Invoke-Step "Done"
Write-Host "Cloud-first sync flow finished." -ForegroundColor Green
