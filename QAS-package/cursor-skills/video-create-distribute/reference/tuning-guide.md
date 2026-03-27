# 逐步体验与调用调优指引

## 一、推荐验证顺序

从单步到串联，逐步验证各环节，便于定位问题。

### Step 1：验证配置与列表（约 2 分钟）

```powershell
cd C:\Users\wei.liu\.cursor\skills\video-create-distribute

# 1.1 列出 Ai Videos 中的视频
node scripts/list-videos.js

# 1.2 JSON 输出（供脚本消费）
node scripts/list-videos.js --json
```

**预期**：看到 Ai Videos 下所有 mp4/mov 等视频，按修改时间倒序。

---

### Step 2：验证分发（约 5 分钟）

前提：Ai Videos 内有视频，且存在 `latest.json`（由 video-pipeline 生成后写入）；或直接指定 `--videos`。

```powershell
# 2.1 分发 latest.json 中的成片到 TikTok（使用 geelark.json 中的 defaultEnvIds）
$env:GEELARK_API_KEY = "你的Bearer Token"
node scripts/distribute.js --latest --platforms tiktok

# 2.2 指定视频路径
node scripts/distribute.js --videos "C:\...\Ai Videos\xxx.mp4" --platforms tiktok
```

**调优**：
- 未配置 `GEELARK_API_KEY`：在 `QAS/config/geelark.json` 中填 `apiKey`，或设环境变量
- `defaultEnvIds` 未生效：确认 `geelark.json` 路径可被 publish.js 找到（见 `GEELARK_CONFIG`）
- 42006 / TikTok 未安装：使用 TikTok 单平台（task/add），脚本已自动区分

---

### Step 3：验证生成（约 2 小时，含排队）

```powershell
# 3.1 仅生成，不分发
node scripts/generate.js --prompt "浪人在竹林中挥刀，5秒" --duration 5

# 3.2 带素材
node scripts/generate.js --prompt "@图片1 在奔跑" --materials "C:\...\Ai test\1\xxx.png" --duration 10
```

**调优**：
- 脚本路径：若 video-pipeline 不在默认位置，设 `VIDEO_PIPELINE_DIR`
- 排队超时：修改 `video-pipeline/config.json` 中 `timeoutMs`

---

### Step 4：验证删除（约 1 分钟）

```powershell
# 先 list 拿到路径，再 delete
node scripts/delete-video.js --path "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos\某视频.mp4"
```

**约束**：仅允许删除 Ai Videos 目录内的文件。

---

### Step 5：一键生成+分发（完整闭环）

```powershell
node scripts/run-all.js --prompt "血坦持武器奔跑，10秒" --duration 10 --platforms tiktok
```

**预期**：先生成 → 写入 latest.json → 再调用 distribute --latest。

---

## 二、在 Cursor 中调用

在 Cursor 对话中，可直接说：

| 说法 | 对应行为 |
|------|----------|
| `/video-create-distribute` 列出我的视频 | 执行 list-videos.js |
| `/video-create-distribute` 把 latest 发到 TikTok | 执行 distribute.js --latest --platforms tiktok |
| `/video-create-distribute` 帮我做个10秒浪人视频发到TikTok | 执行 run-all.js |

AI 会解析意图并执行对应脚本。

---

## 三、调优检查清单

| 问题 | 排查 |
|------|------|
| 列表为空 | 检查 `aiVideosPath` / `--dir` 是否正确 |
| 分发 40003 | 检查 API Key、AppId，尝试 Key 验证 |
| 分发 42006 | 确认云手机安装 TikTok(Asia)，仅选 tiktok 平台 |
| 生成卡住 | 检查 Seedance 是否在 Agent 模式，需切换到「视频生成」 |
| 找不到 config | 设 `GEELARK_CONFIG` 指向 `QAS/config/geelark.json` |
| run-all 中断 | 生成与分发分步执行，先单独验证 generate 和 distribute |

---

## 四、环境变量汇总

| 变量 | 说明 |
|------|------|
| `GEELARK_API_KEY` | GeeLark Bearer Token（必需） |
| `GEELARK_APP_ID` | Key 验证时的 App ID |
| `GEELARK_CONFIG` | geelark.json 路径 |
| `GEELARK_ENV_IDS` | 默认云手机 ID，逗号分隔 |
| `VIDEO_PIPELINE_DIR` | video-pipeline 目录 |
| `GEELARK_PUBLISH_DIR` | geelark-publish 目录 |
| `AI_VIDEOS_PATH` | Ai Videos 目录 |
