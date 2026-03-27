---
name: viral-agent
description: 分析病毒短视频的节奏、镜头结构、分镜与 Prompt。输入本地视频或 URL，输出 report_full.xlsx、shots、关键帧、分镜脚本。Use when user wants to analyze viral short video,拆解爆款节奏,分镜分析,镜头切割,scene cut analysis.
---

# Viral Agent 病毒短视频分析

对短视频进行**视觉节奏 + 分镜 + 创作 Prompt** 全量分析，用于拆解爆款、复刻结构、生成可落地的分镜脚本。

## 触发场景

- 用户说「分析这个视频的节奏」「拆解这个爆款」「帮我做分镜分析」
- 用户提供视频路径或 URL，想了解镜头切换、节奏密度、分镜结构
- 用户要做类似风格的视频，需要参考已有爆款的结构

---

## 前置条件

1. **Viral_Agent 包**：需有完整 Viral_Agent 包（含 Viral_Agent.ps1、tools/ffmpeg、tools/yt-dlp、excel_export.ps1 等）
2. **路径**：优先从 `VIRAL_AGENT_ROOT` 环境变量读取；若无则尝试：
   - `C:\Users\用户名\Desktop\cursor_try\Viral_Agent`
   - 用户当前工作区内含 Viral_Agent 的目录
3. **ffmpeg**：包内需有 `tools/ffmpeg/ffmpeg.exe`
4. **yt-dlp**（可选）：分析 URL 时需有 `tools/yt-dlp/yt-dlp.exe` 或系统 PATH

---

## 工作流

```
Step 1: 确认输入（本地路径 or URL）
Step 2: 定位 Viral_Agent 包，执行 Viral_Agent.ps1
Step 3: 输出到 out/Viral_Agent_<timestamp>/
Step 4: 向用户展示结果路径与核心指标
```

---

## 执行命令

**方式一**：使用 skill 自带的 run.ps1（自动定位 Viral_Agent 包）：
```powershell
cd $env:USERPROFILE\.cursor\skills\viral-agent\scripts
.\run.ps1 -VideoPath "C:\path\to\video.mp4" -OutRoot ".\out"
```

**方式二**：直接调用 Viral_Agent.ps1（需先 cd 到包根目录）：
```powershell
$root = $env:VIRAL_AGENT_ROOT; if (-not $root) { $root = "C:\Users\wei.liu\Desktop\cursor_try\Viral_Agent" }
cd $root
.\Viral_Agent.ps1 -VideoPath "C:\path\to\video.mp4" -OutRoot ".\out"
```

**单视频（URL）**：
```powershell
.\run.ps1 -Url "https://www.youtube.com/watch?v=xxx" -OutRoot ".\out"
```
URL 需登录：加 `-CookiesFromBrowser chrome` 或 `-CookiesPath "path/to/cookies.txt"`

**批量**：
```powershell
.\run.ps1 -VideoPaths "path1.mp4","path2.mp4" -OutRoot ".\out"
# 或 -VideoDir "C:\videos" -VideoDirRecurse
# 或 -InputListPath "list.txt"
```

**只做趋势扫描**：
```powershell
.\run.ps1 -TrendOnly -TrendQueries "viral short","cinematic trailer" -OutRoot ".\out"
```

---

## 关键参数

| 参数 | 说明 |
|------|------|
| `-VideoPath` | 本地视频路径 |
| `-Url` | 视频 URL（支持 yt-dlp 的站点） |
| `-VideoPaths` / `-Urls` | 批量路径/URL |
| `-VideoDir` | 目录下所有视频（可加 `-VideoDirRecurse`） |
| `-InputListPath` | 每行一路径或 URL 的文本 |
| `-SubtitlePath` | 字幕 .srt/.vtt/.txt，用于 hook/节奏分析 |
| `-CookiesPath` | Netscape cookies.txt（登录受限 URL） |
| `-CookiesFromBrowser` | chrome/edge/firefox/brave |
| `-TrendQueries` | 趋势搜索关键词 |
| `-TrendOnly` | 仅跑趋势，不分析视频 |
| `-OutRoot` | 输出根目录，默认 `.\out` |
| `-BatchSummary` | 批量时生成汇总（默认开） |

---

## 输出结构

```
out/Viral_Agent_<timestamp>/
├── report_full.xlsx    # 完整分析（Analysis、Storyboard、Cuts、Shots、Prompt 等）
├── report_full.md
├── contact_sheet.png   # 缩略图拼图
├── scene_cuts.csv      # 场景切点
├── shots.csv           # 镜头列表
├── shot_frames/        # 每镜头 start/mid 关键帧
├── csv_full/           # 各 sheet 的 CSV
└── script.md           # 可复制的分镜脚本
```

---

## 完成告知

```markdown
Viral_Agent 分析完成。
- 输出目录：out/Viral_Agent_<timestamp>
- 报告：report_full.xlsx
- 核心指标：时长 Xs，切割密度 X/10s，镜头数 X，平均镜头 Xs
- 分镜脚本：script.md
```

---

## 故障排查

- **找不到 Viral_Agent**：设置 `$env:VIRAL_AGENT_ROOT = "包所在路径"`
- **ffmpeg 缺失**：确保包内有 tools/ffmpeg/ffmpeg.exe
- **URL 下载失败**：加 -CookiesFromBrowser 或 -CookiesPath；检查网络/代理
- **执行策略**：`powershell -ExecutionPolicy Bypass -File Viral_Agent.ps1 ...`
