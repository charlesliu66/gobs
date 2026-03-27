---
name: geelark-publish
description: 基于已有视频，通过 GeeLark API 批量发布到 Instagram、TikTok、YouTube、Facebook 等社媒平台。支持基于视频生成 prompt 自动生成各平台易火文案与标签建议。Use when user wants to batch publish videos to social media, distribute to multiple platforms, generate captions/hashtags, or publish Ai Videos output.
---

# GeeLark 批量发布技能

将本地已生成的视频（如 video-pipeline 输出的成片）批量发布到 GeeLark 云手机，并分发到 INS、TikTok、YouTube、Facebook 等平台。

---

## 前置条件

1. **GeeLark 账号**：已注册并创建云手机，云手机内已登录各社媒账号
2. **API Key**：已获取 GeeLark API Key，并设置环境变量 `GEELARK_API_KEY`
3. **成片来源**：默认从 `C:\Users\wei.liu\Desktop\cursor_try\Ai Videos` 读取，或用户指定路径

---

## 工作流

```
Step 1: 扫描待发布视频（Ai Videos 或用户指定文件夹）
    ↓
Step 2: 展示视频列表，用户选择要发布的视频
    ↓
Step 3: 用户选择目标平台（INS / TikTok / YouTube / Facebook，可多选）
    ↓
Step 4: 文案与标签
    - 若用户已提供 → 直接使用
    - 若未提供 → 基于视频的生成 prompt + 各平台易火公式，**自动生成建议**（见 Step 4.1）
    ↓
Step 5: 执行 scripts/publish.js，调用 GeeLark API 完成上传与发布
```

---

## Step 1：扫描待发布视频

- **默认路径**：`C:\Users\wei.liu\Desktop\cursor_try\Ai Videos`
- **递归**：列出该目录下所有 `.mp4`、`.mov` 等视频文件
- **展示格式**：文件名、大小、修改时间

若用户指定其他路径，以用户为准。

---

## Step 2：展示视频选项

```markdown
## 待发布视频

1. 生成_20260311_120000.mp4 (2.3 MB, 2026-03-11 12:00)
2. 生成_20260311_121500.mp4 (1.8 MB, 2026-03-11 12:15)
3. ...

请选择要发布的视频：**1** / **2** / **1,2** / **全部**
```

---

## Step 3：选择目标平台

```markdown
## 目标平台（可多选）

- **INS** - Instagram Reels
- **TikTok**
- **YouTube** - YouTube Shorts
- **Facebook**

请选择：**INS,TikTok** / **全部** / **TikTok,YouTube**
```

---

## Step 4：文案与标签

| 配置项 | 说明 | 默认 |
|--------|------|------|
| 文案 caption | 各平台可共用或分别设置 | 空 |
| 标签 hashtags | 如 #viral #short | 空 |
| 发布时间 | 立即发布 or 定时 | 立即 |

### Step 4.1：自动生成文案与标签建议（用户未提供时）

**必须**执行以下流程：

1. **获取视频的生成 prompt**：从对话上下文推断（如用户刚用 video-pipeline 生成了「血坦拿着武器奔跑的5秒视频」），或主动询问用户：「该视频的生成 prompt 是什么？例如：血坦拿着武器奔跑的5秒视频」
2. **读取规范**：`~/.cursor/skills/geelark-publish/reference/caption-formulas.md`
3. **生成建议**：根据 prompt 提取主体、动作、风格，按各平台公式生成 2–3 组文案 + 标签建议
4. **展示格式**：

```markdown
## 文案与标签建议（基于 prompt「血坦拿着武器奔跑的5秒视频」）

### TikTok
**文案 A**：这速度你追得上？🔥
**文案 B**：谁懂，血坦跑起来根本拦不住
**标签**：#fyp #gaming #anime #gameplay #shorts

### Instagram Reels
**文案**：血坦开跑，谁都拦不住 🏃‍♂️💨 // 你最喜欢哪一帧？// 保存下来当壁纸
**标签**：#reels #gaming #anime #gameart #shorts

### YouTube Shorts
**标题**：血坦全速奔跑，这画面绝了 🔥
**标签**：#Shorts #Gaming #Anime

### Facebook
**文案**：血坦持武器全力奔跑的瞬间，有没有勾起你的回忆？🔮 分享给也玩过这个角色的朋友
```

5. **用户确认**：请用户选择或修改后，再执行 Step 5。

若用户已提供文案/标签，跳过本步骤，直接使用用户输入。

---

## Step 5：执行发布

**必须**执行以下命令（使用终端工具）：

```bash
cd C:\Users\wei.liu\.cursor\skills\geelark-publish
$env:GEELARK_API_KEY = "用户的API_KEY"   # 若未在系统环境变量中设置
$env:GEELARK_ENV_ID = "云手机ID"         # 可选，或使用 --env-id
# 本地文件（自动上传）或 URL
node scripts/publish.js --videos "C:\path\to\video.mp4" --env-id "云手机ID" --platforms "tiktok,instagram,youtube" [--caption "文案"]
```

**参数说明**：

| 参数 | 必需 | 说明 |
|------|------|------|
| `--videos` | 是 | 本地路径或 URL，逗号分隔（本地文件自动上传） |
| `--env-id` | 是* | 云手机 ID，或设置环境变量 `GEELARK_ENV_ID` |
| `--platforms` | 否 | tiktok,instagram,youtube；多选时走**多渠道分发**（一次发三平台） |
| `--caption` | 否 | 发布文案/标题 |
| `--hashtags` | 否 | 标签 |
| `--plan-name` | 否 | 任务计划名称 |

**Facebook 自动评论**（`--action fb-comment`）：

| 参数 | 必需 | 说明 |
|------|------|------|
| `--action` | 是 | 设为 `fb-comment` |
| `--post-address` | 是 | 目标帖子链接 |
| `--comments` | 是 | 评论内容，逗号或竖线分隔，最多 10 条 |
| `--keywords` | 是 | 关键词，逗号或竖线分隔，最多 10 个 |
| `--env-id` | 是* | 云手机 ID |

示例：`node scripts/publish.js --action fb-comment --post-address "https://facebook.com/xxx" --comments "评论1|评论2" --keywords "关键词1,关键词2" --env-id "云手机ID"`

**API Key**：优先从环境变量 `GEELARK_API_KEY` 读取；未设置则提示用户配置。

**说明**：支持本地视频直传（upload/getUrl + PUT）；`--platforms` 含多平台时使用 multiPlatformVideoDistribution 一次分发到 TikTok + Instagram Reels + YouTube Shorts；`--action fb-comment` 时调用 faceBookAutoComment 对指定帖子自动评论。

---

## 完成告知

```markdown
发布任务已提交。请在 GeeLark 控制台查看执行状态。
- 视频已上传至 GeeLark 素材库
- 已创建批量发布任务，目标平台：TikTok, Instagram
```

---

## 故障排查

- **API Key 未设置**：提示用户执行 `[System.Environment]::SetEnvironmentVariable("GEELARK_API_KEY", "xxx", "User")` 或传入脚本
- **上传失败**：检查视频格式（mp4 推荐）、大小限制（参考 GeeLark 文档）
- **发布失败**：确认云手机内已登录对应社媒账号，且账号状态正常

---

## 脚本说明

`scripts/publish.js` 已实现：
- **本地视频直传**：本地路径自动调用 upload/getUrl + PUT 上传
- **多渠道分发**：`--platforms tiktok,instagram,youtube` 时使用 multiPlatformVideoDistribution 一次发三平台
- **TikTok 单平台**：未指定 platforms 时使用 task/add
- **Facebook 自动评论**：`--action fb-comment` 时调用 faceBookAutoComment，支持指定 post 链接
- 参数：`--videos`、`--env-id`、`--platforms`、`--caption`、`--hashtags`；评论模式：`--post-address`、`--comments`、`--keywords`

详见 `reference/api-notes.md`。

---

## 参考

- GeeLark API 文档：https://open.geelark.com/api
- 文件上传、自动化任务、云手机管理接口
