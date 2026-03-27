@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 若浏览器无法打开，可能是 profile 损坏。本脚本将备份旧 profile 后重新运行。
set BD=%USERPROFILE%\.video-pipeline-browser
if exist "%BD%" (
  echo 备份并清除: %BD%
  move "%BD%" "%BD%.bak.%date:~0,4%%date:~5,2%%date:~8,2%" 2>nul
  if exist "%BD%" rmdir /s /q "%BD%" 2>nul
)
echo.
echo 正在启动浪人视频生成...
call run-ronin-b.bat
