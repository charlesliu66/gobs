# QAS 新电脑部署说明

## 一、目录结构

拷贝后按以下结构放置：

```
目标电脑某目录（如 D:\dev\QAS-package\）
├── QAS/                    # 主项目，放入 cursor 工作区
├── video-pipeline/         # 视频生成，与 QAS 同级
├── cursor-skills/          # 需复制到 ~/.cursor/skills/
└── config-templates/       # 配置模板
```

## 二、步骤

### 1. 放置项目

- 将 QAS 和 video-pipeline 放到同一父目录，例如：D:\dev\cursor_try\QAS 与 D:\dev\cursor_try\video-pipeline

### 2. 安装 Skills

将 cursor-skills 下的 5 个文件夹复制到 Cursor 的 skills 目录：
- Windows: %USERPROFILE%\.cursor\skills\
- 即 C:\Users\你的用户名\.cursor\skills\

复制的文件夹：video-create-distribute、video-pipeline、geelark-publish、video-director、storyboard-studio、game-director-pro、viral-agent

如果目标电脑已有同名 skill，可覆盖或先备份。

### 3. 配置

1. QAS/config/geelark.json：从 config-templates/geelark.json.template 复制，填入 appId、apiKey、devices、aiVideosPath 等
2. h5-video-tool-api/.env：从 .env.template 复制为 .env，填入 COMPASS_API_KEY、SEEDANCE_API_KEY 等
3. 环境变量 VIDEO_PIPELINE_DIR（可选）：若 video-pipeline 不在 Desktop\cursor_try\video-pipeline，需设置此变量

### 4. 安装依赖

```powershell
cd D:\dev\cursor_try\QAS\h5-video-tool-api
npm install
cd ..\h5-video-tool
npm install
cd D:\dev\cursor_try\video-pipeline
npm install
npx playwright install chromium
```

### 5. 创建输出目录

```powershell
mkdir "C:\Users\你的用户名\Desktop\cursor_try\Ai Videos"
```

## 三、验证

在 Cursor 中打开 QAS 项目，对 AI 说：「做个 10 秒浪人视频发到 TikTok」或「列出我的视频」

## 四、依赖的 Skills 清单

| Skill | 功能 |
|-------|------|
| video-create-distribute | 统一入口：生成+管理+分发 |
| video-pipeline | 视频生成（调 run.js） |
| geelark-publish | 成片发到 TikTok/INS 等 |
| video-director | 创意→分镜 prompt |
| storyboard-studio | 分镜规范 |

---
打包时间: __TIMESTAMP__
