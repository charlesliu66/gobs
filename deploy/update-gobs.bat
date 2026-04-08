@echo off
chcp 65001 >nul
echo ========================================
echo   GOBS 一键更新脚本
echo ========================================
echo.

set SERVER=ubuntu@49.235.61.68
set REPO_URL=https://github.com/charlesliu66/gobs/raw/main
set DOWNLOAD_DIR=%USERPROFILE%\Downloads\gobs-update

if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"

set /p PACKAGES="输入包前缀（如 gobs-fixes-v3）: "
if "%PACKAGES%"=="" (
    echo 请输入包前缀！
    pause
    exit /b 1
)

echo.
echo [1/4] 下载部署包...
curl -L -o "%DOWNLOAD_DIR%\backend.tar.gz" "%REPO_URL%/%PACKAGES%-backend.tar.gz"
curl -L -o "%DOWNLOAD_DIR%\frontend.tar.gz" "%REPO_URL%/%PACKAGES%-frontend.tar.gz"

echo.
echo [2/4] SCP 上传到服务器...
scp "%DOWNLOAD_DIR%\backend.tar.gz" %SERVER%:~/gobs-update-backend.tar.gz
scp "%DOWNLOAD_DIR%\frontend.tar.gz" %SERVER%:~/gobs-update-frontend.tar.gz

echo.
echo [3/4] 服务器端更新...
ssh %SERVER% "tar -xzf ~/gobs-update-backend.tar.gz -C ~/gobs/backend/ && pm2 restart gobs-api && sudo rm -rf ~/gobs/frontend/* && tar -xzf ~/gobs-update-frontend.tar.gz -C ~/gobs/frontend/ && if [ -d ~/gobs/frontend/dist ]; then cp -r ~/gobs/frontend/dist/* ~/gobs/frontend/ && rm -rf ~/gobs/frontend/dist; fi && sudo chmod -R 755 ~/gobs/frontend && sudo systemctl reload nginx && rm -f ~/gobs-update-backend.tar.gz ~/gobs-update-frontend.tar.gz && echo done"

echo.
echo [4/4] 清理本地临时文件...
del /q "%DOWNLOAD_DIR%\backend.tar.gz" 2>nul
del /q "%DOWNLOAD_DIR%\frontend.tar.gz" 2>nul

echo.
echo ========================================
echo   更新完成！访问 http://49.235.61.68
echo ========================================
pause
