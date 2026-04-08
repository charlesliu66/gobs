@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\" (
  echo 首次运行：正在安装根目录依赖（concurrently）...
  call npm install
  if errorlevel 1 exit /b 1
)

echo.
echo 【重要】请勿关闭本窗口！关掉后 5173 会停，浏览器会显示 ERR_CONNECTION_REFUSED
echo.
echo 正在同时启动：h5-video-tool-api :3001  ^|  SJ/web 矩阵 :3000  ^|  h5-video-tool :5173
echo 就绪后将尝试打开浏览器 http://127.0.0.1:5173
echo 按 Ctrl+C 可结束全部进程
echo.

call npm run dev
pause
