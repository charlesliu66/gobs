@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\.."

echo === QAS Deploy Package ===
echo.

node "%~dp0package-for-deploy.js"
if errorlevel 1 (
  echo.
  echo Failed. Make sure Node.js is installed.
  exit /b 1
)

exit /b 0
