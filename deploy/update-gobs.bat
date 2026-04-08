@echo off
chcp 65001 >nul
echo ========================================
echo   GOBS 一键更新脚本 v2
echo   支持：GOBS前端 + 后端 + SJ矩阵
echo ========================================
echo.

set SERVER=ubuntu@49.235.61.68
set REPO_URL=https://github.com/charlesliu66/gobs/raw/main
set DOWNLOAD_DIR=%USERPROFILE%\Downloads\gobs-update

if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"

set /p PACKAGES="输入包前缀（如 gobs-bridge）: "
if "%PACKAGES%"=="" (
    echo 请输入包前缀！
    pause
    exit /b 1
)

echo.
echo [1/5] 下载 GOBS 部署包...
curl -L -o "%DOWNLOAD_DIR%\backend.tar.gz" "%REPO_URL%/%PACKAGES%-backend.tar.gz"
curl -L -o "%DOWNLOAD_DIR%\frontend.tar.gz" "%REPO_URL%/%PACKAGES%-frontend.tar.gz"

echo.
set /p HAS_SJ="是否包含 SJ 矩阵更新？(y/n，默认n): "
if /i "%HAS_SJ%"=="y" (
    echo 下载 SJ 部署包...
    set /p SJ_PKG="SJ包名（默认 gobs-sj-bridge）: "
    if "%SJ_PKG%"=="" set SJ_PKG=gobs-sj-bridge
    curl -L -o "%DOWNLOAD_DIR%\sj.tar.gz" "%REPO_URL%/%SJ_PKG%.tar.gz"
)

echo.
echo [2/5] SCP 上传到服务器...
scp "%DOWNLOAD_DIR%\backend.tar.gz" %SERVER%:~/gobs-update-backend.tar.gz
scp "%DOWNLOAD_DIR%\frontend.tar.gz" %SERVER%:~/gobs-update-frontend.tar.gz
if /i "%HAS_SJ%"=="y" (
    scp "%DOWNLOAD_DIR%\sj.tar.gz" %SERVER%:~/gobs-update-sj.tar.gz
)

echo.
echo [3/5] 更新 GOBS 后端...
ssh %SERVER% "tar -xzf ~/gobs-update-backend.tar.gz -C ~/gobs/backend/ && pm2 restart gobs-api && echo 'GOBS后端 OK'"

echo.
echo [4/5] 更新 GOBS 前端...
ssh %SERVER% "sudo rm -rf ~/gobs/frontend/* && tar -xzf ~/gobs-update-frontend.tar.gz -C ~/gobs/frontend/ && if [ -d ~/gobs/frontend/dist ]; then cp -r ~/gobs/frontend/dist/* ~/gobs/frontend/ && rm -rf ~/gobs/frontend/dist; fi && sudo chmod -R 755 ~/gobs/frontend && sudo systemctl reload nginx && echo 'GOBS前端 OK'"

if /i "%HAS_SJ%"=="y" (
    echo.
    echo [5/5] 更新 SJ 矩阵...
    ssh %SERVER% "pm2 stop gobs-sj 2>/dev/null; rm -rf ~/gobs/sj/.next ~/gobs/sj/next.config.mjs; tar -xzf ~/gobs-update-sj.tar.gz -C ~/gobs/sj/ && cd ~/gobs/sj && npm install --registry https://mirrors.tencentyun.com/npm/ && pm2 restart gobs-sj && echo 'SJ矩阵 OK'"
) else (
    echo.
    echo [5/5] 跳过 SJ 矩阵更新
)

echo.
echo 清理临时文件...
ssh %SERVER% "rm -f ~/gobs-update-backend.tar.gz ~/gobs-update-frontend.tar.gz ~/gobs-update-sj.tar.gz 2>/dev/null"
del /q "%DOWNLOAD_DIR%\backend.tar.gz" 2>nul
del /q "%DOWNLOAD_DIR%\frontend.tar.gz" 2>nul
del /q "%DOWNLOAD_DIR%\sj.tar.gz" 2>nul

echo.
echo ========================================
echo   更新完成！访问 http://49.235.61.68
echo ========================================
pause
