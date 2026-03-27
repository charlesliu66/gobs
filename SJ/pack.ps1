# Pack script: create SJ-release.zip for sharing (excludes node_modules, .next, .git, .env, .env.local)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$outZip = Join-Path $root "SJ-release.zip"
$tempDir = Join-Path $root "_pack_temp"

# Clean temp and create
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Robocopy: mirror structure excluding heavy/sensitive dirs (destination must exist)
$dest = Join-Path $tempDir "SJ"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
robocopy $root $dest /E /XD node_modules .next .git __pycache__ .cursor _pack_temp /XF .env .env.local /NFL /NDL /NJH /NJS /NC /NS

# Copy env examples explicitly (robocopy /XF excludes them from root but we want .example)
Copy-Item (Join-Path $root ".env.example") (Join-Path $dest ".env.example") -ErrorAction SilentlyContinue
$webDest = Join-Path $dest "web"
if (Test-Path (Join-Path $root "web\.env.local.example")) {
    if (-not (Test-Path $webDest)) { New-Item -ItemType Directory -Path $webDest -Force | Out-Null }
    Copy-Item (Join-Path $root "web\.env.local.example") (Join-Path $webDest ".env.local.example") -Force
}

if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path (Join-Path $tempDir "SJ") -DestinationPath $outZip -CompressionLevel Optimal -Force
Remove-Item -Recurse -Force $tempDir

Write-Host "Done. Package: $outZip"
Get-Item $outZip | Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}
