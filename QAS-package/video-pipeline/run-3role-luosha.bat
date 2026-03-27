@echo off
chcp 65001 >nul
cd /d "%~dp0"
node run.js --prompt-file prompt-3role-luosha.txt --materials-file materials-3role-luosha.txt --duration 15 --aspect 16:9 --output "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos"
pause
