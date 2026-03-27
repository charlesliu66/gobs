@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\.."

echo === QAS Deploy Package ===
echo.

call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0package-for-transfer.ps1"
if errorlevel 1 exit /b 1

echo.
echo Cleaning sensitive files and large videos...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem -Path '%~dp0..\QAS-package' -Recurse -Filter '.env' -File | Remove-Item -Force -ErrorAction SilentlyContinue; ^
   Get-ChildItem -Path '%~dp0..\QAS-package' -Recurse -Filter 'gmail.env' -File | Remove-Item -Force -ErrorAction SilentlyContinue; ^
   Get-ChildItem -Path '%~dp0..\QAS-package' -Recurse -Include '*.mp4','*.webm','*.mov','*.avi' -File | Remove-Item -Force -ErrorAction SilentlyContinue"
if errorlevel 1 exit /b 1

echo Creating ZIP...
set ZIPNAME=QAS-deploy-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set ZIPNAME=%ZIPNAME: =0%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -Path '%~dp0..\QAS-package\*' -DestinationPath '%~dp0..\QAS-deploy.zip' -Force -CompressionLevel Optimal"
if errorlevel 1 exit /b 1

for %%A in ("%~dp0..\QAS-deploy.zip") do set SIZE=%%~zA
set /a SIZEMB=%SIZE%/1048576
echo.
echo === Done ===
echo ZIP: %~dp0..\QAS-deploy.zip (%SIZEMB% MB)
echo.
echo Next: scp QAS-deploy.zip user@host:/home/user/
echo       unzip QAS-deploy.zip
echo.
exit /b 0
