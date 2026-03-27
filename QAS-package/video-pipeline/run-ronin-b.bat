@echo off
REM 5秒浪人奔跑视频 - 方案 B（已手动登录时使用）
REM 用法：先确保已登录即梦，再运行此脚本
REM 
REM 方式1 - CDP 连接已打开的 Chrome（推荐）：
REM   1. 运行 launch-chrome-for-pipeline.bat 启动带调试端口的 Chrome
REM   2. 在 Chrome 中登录即梦并打开视频生成页
REM   3. 运行本脚本
REM
REM 方式2 - 让脚本自己开浏览器：
REM   关闭所有 Chrome 窗口后，直接运行本脚本（加 --skip-login 若已保存登录）

cd /d "%~dp0"
set PROMPT=[3D 渲染风格]日式武士意境，5 秒。[00:00-00:02] 镜头 1：@图片1 在晨雾中向前奔跑，柔和逆光，背影特写。[00:02-00:05] 镜头 2：@图片1 沿石板路奔跑，衣袖扬起，缓慢推进。冷色调，电影感，无敏感元素，虚构场景。
set MATERIALS=C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\浪人.png
set OUTPUT=C:\Users\wei.liu\Desktop\cursor_try\Ai Videos

REM 直接运行（脚本会打开 Playwright Chromium 浏览器）
node run.js --prompt "%PROMPT%" --materials "%MATERIALS%" --duration 5 --aspect 16:9 --output "%OUTPUT%"
pause
