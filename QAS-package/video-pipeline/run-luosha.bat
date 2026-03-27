@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动洛萨中庭 6 角色视频生成...
echo 素材：7 张（6 角色 + 洛萨中庭_俯瞰）
echo 时长：15 秒
echo.
node run.js --prompt-file prompt-luosha-3.txt --materials-file materials-luosha-3.txt --duration 15 --aspect 16:9 --output "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos"
pause
