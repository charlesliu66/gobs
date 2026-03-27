# H5 视频工具 - 一键构建并打包部署文件
# 用法：在项目根目录执行 .\scripts\build-deploy.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host "=== 1. 构建前端 ===" -ForegroundColor Cyan
Set-Location "$root\h5-video-tool"
npm run build

Write-Host "`n=== 2. 构建后端 ===" -ForegroundColor Cyan
Set-Location "$root\h5-video-tool-api"
npm run build

Write-Host "`n=== 3. 打包 deploy ===" -ForegroundColor Cyan
$deploy = "$root\deploy"
Remove-Item -Recurse -Force $deploy -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$deploy\frontend" | Out-Null
New-Item -ItemType Directory -Force -Path "$deploy\api" | Out-Null
Copy-Item -Recurse "$root\h5-video-tool\dist\*" "$deploy\frontend\"
Copy-Item -Recurse "$root\h5-video-tool-api\dist\*" "$deploy\api\"
Copy-Item "$root\h5-video-tool-api\package.json" "$deploy\api\"
if (Test-Path "$root\h5-video-tool-api\.env") {
    Copy-Item "$root\h5-video-tool-api\.env" "$deploy\api\"
    Write-Host "已复制 .env" -ForegroundColor Gray
} else {
    Copy-Item "$root\h5-video-tool-api\.env.example" "$deploy\api\.env"
    Write-Host "请编辑 deploy\api\.env 填入密钥！" -ForegroundColor Yellow
}

Write-Host "`n=== 完成！===" -ForegroundColor Green
Write-Host "deploy 文件夹已生成：" -ForegroundColor Gray
Write-Host "  - deploy\frontend  上传到服务器 qas-h5/frontend/" -ForegroundColor Gray
Write-Host "  - deploy\api       上传到服务器 qas-h5/api/" -ForegroundColor Gray
Write-Host "`n详细部署步骤见：docs\h5-deploy-guide-detailed.md" -ForegroundColor Gray
