@echo off
chcp 65001 >nul
cd /d "%~dp0h5-video-tool"

echo.
echo 【仅启动 GOBS 网页】端口 5173 —— 不启动矩阵与 API
echo 请勿关闭本窗口，否则浏览器会提示连接被拒绝（ERR_CONNECTION_REFUSED）
echo.

if not exist "node_modules\" (
  echo 正在安装依赖...
  call npm install
  if errorlevel 1 exit /b 1
)

call npm run dev
pause
