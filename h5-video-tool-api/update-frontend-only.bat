```bat
@echo off
chcp 65001 >nul
echo ==============================
echo GOBS 前端单独更新脚本
echo ==============================
echo.

set SERVER=ubuntu@49.235.61.68
set REPO_URL=https://github.com/charlesliu66/gobs/raw/main

set /p PKG="输入前端包名（如 gobs-project-create-fix-frontend）: "
if "%PKG%"=="" (
echo 请输入包名！
pause
exit /b 1
)

echo.
echo [1/3] 下载前端包...
curl -L -o "%USERPROFILE%\Downloads\frontend.tar.gz" "%REPO_URL%/%PKG%.tar.gz"

echo.
echo [2/3] 上传到服务器...
scp "%USERPROFILE%\Downloads\frontend.tar.gz" %SERVER%:~/frontend.tar.gz

echo.
echo [3/3] 更新服务器前端...
ssh %SERVER% "sudo rm -rf ~/gobs/frontend/* && tar -xzf ~/frontend.tar.gz -C ~/gobs/frontend/ && sudo chmod -R 755 ~/gobs/frontend && sudo systemctl reload nginx && rm -f ~/frontend.tar.gz && echo done"

echo.
echo 更新完成
pause
```