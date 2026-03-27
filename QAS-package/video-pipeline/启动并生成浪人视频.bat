@echo off
chcp 65001 >nul
echo ========================================
echo 浪人奔跑视频 - 两步操作
echo ========================================
echo.
echo 【步骤 1】请先手动启动带调试端口的 Chrome：
echo.
echo 方法：关闭所有 Chrome 窗口后，在 CMD 或 PowerShell 中运行：
echo   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
echo.
echo 或者双击运行同一目录下的：launch-chrome-for-pipeline.bat
echo.
echo 【步骤 2】Chrome 打开后：
echo   - 在 Chrome 中访问 https://jimeng.jianying.com 并登录即梦
echo   - 然后回到这里按任意键，脚本将连接该 Chrome 并自动完成上传、填 prompt、生成
echo.
echo ----------------------------------------
pause
echo.
cd /d "%~dp0"
set PROMPT=【3D 渲染风格】日式武士意境，5 秒。[00:00-00:02] 镜头 1：@图片1 在晨雾中向前奔跑，柔和逆光，背影特写。[00:02-00:05] 镜头 2：@图片1 沿石板路奔跑，衣袖扬起，缓慢推进。冷色调，电影感，无敏感元素，虚构场景。
set MATERIALS=C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\浪人.png
set OUTPUT=C:\Users\wei.liu\Desktop\cursor_try\Ai Videos
echo 正在连接 Chrome 并执行...
node run.js --prompt "%PROMPT%" --materials "%MATERIALS%" --duration 5 --aspect 16:9 --output "%OUTPUT%" --cdp-port 9222
pause
