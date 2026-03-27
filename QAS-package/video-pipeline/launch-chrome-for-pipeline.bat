@echo off
REM 用调试模式启动 Chrome，供 video-pipeline 连接。先运行此脚本，在 Chrome 中登录即梦后再运行 run.js --cdp-port 9222
REM 若 Chrome 已在运行，请先关闭所有 Chrome 窗口后再运行此脚本。

set PORT=9222
echo 正在以调试模式启动 Chrome (端口 %PORT%)...
echo 请在打开的 Chrome 中登录即梦，然后运行:
echo   node run.js --prompt "你的prompt" --materials "路径" --cdp-port %PORT%
echo.

for /f "tokens=2 delims==" %%a in ('wmic process where "name='chrome.exe'" get executablePath /format:list 2^>nul ^| findstr "="') do set CHROME=%%a
if not defined CHROME (
  set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
  if not exist "%CHROME%" set CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe
)
if not exist "%CHROME%" (
  echo 未找到 Chrome，请手动运行: "Chrome路径" --remote-debugging-port=%PORT%
  pause
  exit /b 1
)

start "" "%CHROME%" --remote-debugging-port=%PORT%
echo Chrome 已启动（使用你的默认配置，登录状态会保留）。
echo 若未登录即梦请先登录，然后在另一个终端运行:
echo   node run.js --prompt "你的prompt" --materials "路径" --cdp-port %PORT%
pause
