---
name: video-create-distribute
description: 视频生成+分发统一技能。串联 video-pipeline（生成）与 geelark-publish（分发），支持管理视频列表与删除。Use when user wants "生成视频""发到TikTok""管理我的视频""一键生成并分发"。
---

# Video Create & Distribute 统一技能

将**生成**、**管理**、**分发**串联为统一入口，内部调用 video-pipeline 与 geelark-publish。

---

## 能力

| 意图 | 调用 | 说明 |
|------|------|------|
| 生成视频 | `generate.js` | 调用 video-pipeline |
| 管理（列表） | `list-videos.js` | 扫描 Ai Videos，返回视频列表 |
| 管理（删除） | `delete-video.js` | 按路径删除视频 |
| 分发视频 | `distribute.js` | 调用 geelark-publish |
| 一键生成+分发 | `run-all.js` | generate → distribute --latest |

---

## 逐步体验与调优

见 `reference/tuning-guide.md`。

**快速验证**：
```bash
cd ~/.cursor/skills/video-create-distribute
node scripts/list-videos.js                              # 1. 验证列表
node scripts/distribute.js --latest --platforms tiktok   # 2. 验证分发（需有 latest.json）
node scripts/run-all.js --prompt "..." --platforms tiktok # 3. 一键流程
```

---

## 配置

- **GeeLark**：`QAS/config/geelark.json` 或 `GEELARK_CONFIG` 环境变量
- **video-pipeline**：`video-pipeline/config.json`
- **Ai Videos**：默认 `C:\Users\wei.liu\Desktop\cursor_try\Ai Videos`

---

## 路径

| 项目 | 路径 |
|------|------|
| 技能目录 | `~/.cursor/skills/video-create-distribute` |
| video-pipeline | `C:\Users\wei.liu\Desktop\cursor_try\video-pipeline` |
| geelark-publish | `~/.cursor/skills/geelark-publish` |
| Ai Videos | `C:\Users\wei.liu\Desktop\cursor_try\Ai Videos` |
