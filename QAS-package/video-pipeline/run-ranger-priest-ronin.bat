@echo off
chcp 65001 >nul
cd /d "%~dp0"
node run.js --prompt-file prompt-ranger-priest-ronin.txt --materials-file materials-local-4.txt --duration 15 --aspect 16:9 --output "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos"
pause
