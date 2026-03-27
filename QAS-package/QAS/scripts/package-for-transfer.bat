@echo off
chcp 65001 >nul
setlocal
set "QAS_ROOT=%~dp0.."
set "OUT=%QAS_ROOT%\QAS-package"
set "CURSOR_SKILLS=%USERPROFILE%\.cursor\skills"
set "CURSOR_TRY=%QAS_ROOT%\.."

echo === QAS 打包脚本 ===
echo 输出目录: %OUT%
echo.

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
mkdir "%OUT%\QAS"
mkdir "%OUT%\video-pipeline"
mkdir "%OUT%\cursor-skills"
mkdir "%OUT%\config-templates"

echo [1/4] 复制 QAS 项目...
robocopy "%QAS_ROOT%" "%OUT%\QAS" /E /XD node_modules .git QAS-package .next dist build /XF *.log .env gmail.env *.pdf
if exist "%OUT%\QAS\h5-video-tool\node_modules" rmdir /s /q "%OUT%\QAS\h5-video-tool\node_modules"
if exist "%OUT%\QAS\h5-video-tool-api\node_modules" rmdir /s /q "%OUT%\QAS\h5-video-tool-api\node_modules"
if exist "%QAS_ROOT%\h5-video-tool-api\.env.example" copy "%QAS_ROOT%\h5-video-tool-api\.env.example" "%OUT%\QAS\h5-video-tool-api\.env.template"

echo [2/4] 复制 video-pipeline...
if exist "%CURSOR_TRY%\video-pipeline" (
  robocopy "%CURSOR_TRY%\video-pipeline" "%OUT%\video-pipeline" /E /XD node_modules .git
  if exist "%OUT%\video-pipeline\node_modules" rmdir /s /q "%OUT%\video-pipeline\node_modules"
  echo   video-pipeline 已复制
) else (
  echo   警告: 未找到 video-pipeline
)

echo [3/4] 复制 Cursor Skills...
for %%s in (video-create-distribute video-pipeline geelark-publish video-director storyboard-studio) do (
  if exist "%CURSOR_SKILLS%\%%s" (
    xcopy "%CURSOR_SKILLS%\%%s" "%OUT%\cursor-skills\%%s\" /E /I /Q >nul
    echo   - %%s
  )
)

echo [4/4] 生成配置模板...
(
echo {
echo   "appId": "YOUR_GEELARK_APP_ID",
echo   "apiKey": "YOUR_GEELARK_API_KEY",
echo   "devices": [],
echo   "defaultEnvIds": [],
echo   "aiVideosPath": "C:\\Users\\YOUR_USER\\Desktop\\cursor_try\\Ai Videos",
echo   "latestJsonPath": "C:\\Users\\YOUR_USER\\Desktop\\cursor_try\\Ai Videos\\latest.json"
echo }
) > "%OUT%\config-templates\geelark.json.template"

copy "%QAS_ROOT%\scripts\DEPLOY-README-template.md" "%OUT%\DEPLOY-README.md" >nul

echo.
echo === 打包完成 ===
echo 输出: %OUT%
echo.
echo 下一步:
echo   1. 将整个 QAS-package 文件夹拷贝到 U 盘/网盘
echo   2. 在另一台电脑解压后，按 DEPLOY-README.md 操作
echo   3. 记得在新电脑填写 config 和 .env 中的密钥
echo.
pause
