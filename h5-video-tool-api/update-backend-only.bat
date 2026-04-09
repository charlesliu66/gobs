```bat
@echo off
chcp 65001 >nul
echo ==============================
echo GOBS 后端单独更新脚本
echo ==============================
echo.

set SERVER=ubuntu@49.235.61.68
set REPO_URL=https://github.com/charlesliu66/gobs/raw/main

set /p PKG="输入后端包名（如 gobs-story-retry-backend）: "
if "%PKG%"=="" (
echo 请输入包名！
pause
exit /b 1
)

echo.
echo [1/3] 下载后端包...
curl -L -o "%USERPROFILE%\Downloads\backend.tar.gz" "%REPO_URL%/%PKG%.tar.gz"

echo.
echo [2/3] 上传到服务器...
scp "%USERPROFILE%\Downloads\backend.tar.gz" %SERVER%:~/backend.tar.gz

echo.
echo [3/3] 更新服务器后端...
ssh %SERVER% "tar -xzf ~/backend.tar.gz -C ~/gobs/backend/dist/ && pm2 restart gobs-api && rm -f ~/backend.tar.gz && echo done"

echo.
echo 更新完成
pause
```
