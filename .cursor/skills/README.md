# QAS 项目 Skills 清单

本目录包含 QAS（Quality at Scale）项目所需的全部 Cursor Skills，**已随项目打包**，同事获取 QAS 文件夹后即可使用，无需单独安装。

---

## Skills 列表

| Skill | 功能 | 触发示例 |
|-------|------|----------|
| **video-create-distribute** | 统一入口：生成 + 管理 + 分发 | 「做个10秒浪人视频发到 TikTok」 |
| **video-pipeline** | 视频生成：Prompt + 素材 → Seedance → 成片 | 「帮我生成一个10秒浪人视频」 |
| **geelark-publish** | 成片 → GeeLark API → TikTok/INS/YouTube/Facebook | 「发到三台手机的 TikTok」 |
| **video-director** | 创意 → 分镜 prompt（Seedance 2.0 规则） | 「10秒浪人打怪物的 prompt 怎么写」 |
| **storyboard-studio** | 分镜规范：镜头、构图、光线、运镜 | 被 video-director 调用 |
| **game-director-pro** | 游戏宣传片：分镜 → 首尾帧 → 视频 → 成片 | 「做游戏宣传片」「新英雄视频」 |
| **viral-agent** | 病毒短视频节奏与分镜分析 | 「分析这个视频的节奏」「拆解爆款」 |

---

## 使用方式

### 项目内使用（推荐）

1. 用 Cursor 打开 **QAS 项目根目录**
2. Cursor 会自动加载 `.cursor/skills/` 下的项目级 Skills
3. 在对话中说「做个10秒浪人视频发到 TikTok」「分析这个视频的节奏」等，AI 会调用对应 Skill

### 全局使用（可选）

若希望在其他项目中也能用这些 Skills，可复制到 Cursor 用户级目录：

- **Windows**: `%USERPROFILE%\.cursor\skills\`
- **macOS/Linux**: `~/.cursor/skills/`

```powershell
# 示例：复制到用户级（Windows）
Copy-Item -Path ".cursor\skills\*" -Destination "$env:USERPROFILE\.cursor\skills\" -Recurse -Force
```

---

## 依赖与配置

| Skill | 依赖 | 配置 |
|-------|------|------|
| video-pipeline | video-pipeline 包（含 run.js）、Seedance API | `QAS/config/`、环境变量 |
| geelark-publish | GeeLark 云手机、API Key | `config/geelark.json`、`GEELARK_API_KEY` |
| game-director-pro | 生图 API、视频 API | `.env`（见 skill 内 .env.example） |
| viral-agent | Viral_Agent 包、ffmpeg、yt-dlp | `VIRAL_AGENT_ROOT` |

详见各 Skill 目录内的 `SKILL.md` 与 `README.md`。

---

## 分享给同事

1. 将整个 **QAS 文件夹**（含 `.cursor/skills/`）打包发给同事
2. 同事解压后，用 Cursor 打开 QAS 项目
3. 按需配置 `config/geelark.json`、`.env` 等（见项目根目录 `docs/` 下的部署说明）
4. 即可在对话中使用上述 Skills
