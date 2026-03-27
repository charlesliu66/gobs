# Game Director Pro 与 QAS 项目整合方案

**更新日期**: 2025-03-17  
**目的**: 将 `game-director-pro` skill 与 QAS（h5-video-tool-api）项目整合，实现游戏宣传/病毒向短视频全流程。

---

## 一、两者能力对比

| 能力 | game-director-pro | QAS (h5-video-tool-api) |
|------|-------------------|--------------------------|
| **创意简报** | Stage 1 结构化简报、确认门 | 无 |
| **分镜/脚本** | 宣传向公式 4/5、新英雄/新地图模板、病毒向 Hook | video-director、storyboardParser |
| **首帧/尾帧图** | 每镜必出，`generate_frame_images.py` | 仅分镜图（单张），`POST /api/storyboard/images` |
| **视频生成** | 火山 Ark Seedance (`call_kling_api.py`) | Compass Veo (`veo_generate.py`) |
| **多镜头合成** | `concat_shots_to_final.py` | `POST /api/video/generate-multishot` |
| **素材库** | UNC 路径 `\\10.21.100.89\...` | Google Drive |
| **社媒发布** | Stage 3.6 文案/Hashtag | GeeLark API |

---

## 二、整合方式（推荐优先级）

### 方式 A：Skill 安装（最简，Agent 层）

**适用**：在 Cursor 对话中做游戏宣传片时，让 Agent 自动加载 game-director-pro 流程。

**步骤**：

1. 复制 game-director-pro 到 QAS 项目内 skills：
   ```
   QAS/
   └── .cursor/
       └── skills/
           └── game-director-pro/   ← 整个文件夹
   ```

2. 或复制到 Cursor 用户级 skills（全局可用）：
   - 路径见 Cursor 设置 → Skills，常见为 `~/.cursor/skills/`

3. 配置 `.env`（在 QAS 根或 game-director-pro 目录）：
   ```env
   FRAME_IMAGE_API_KEY=火山Ark的Key
   FRAME_IMAGE_API_URL=volcano
   FRAME_IMAGE_API_MODEL=ep-xxxx
   SEEDANCE_API_KEY=火山Ark的Key
   ```

**效果**：在 QAS 项目对话中说「做新英雄 XX 宣传片」「新地图展示」时，Agent 会按 game-director-pro 三阶段执行；脚本仍直接调火山 Ark，与 QAS API 独立运行。

---

### 方式 B：API 路由对接（H5 可调用）

**适用**：希望 H5 前端也能走 game-director-pro 的「创意简报 → 分镜 → 首尾帧 → 视频」流程。

**新增路由建议**：

| 路由 | 输入 | 输出 | 实现思路 |
|------|------|------|----------|
| `POST /api/game-director/brief` | 用户描述 | 创意简报 JSON | 调用 game-director-pro 的 Stage 1 逻辑（可抽成 TS 或子进程调 Python） |
| `POST /api/game-director/storyboard` | 确认的简报 | 分镜表（含首帧/尾帧 prompt） | 按公式 4/5 生成，输出与 `storyboardParser` 兼容格式 |
| `POST /api/game-director/frames` | 分镜 JSON | 首帧/尾帧图 base64 | 封装 `generate_frame_images.py` 或改为调 `imagenPython` |
| `POST /api/game-director/video` | shots 数组 | 成片 | 封装 `call_kling_api.py` 或复用 `generate-multishot`（需切 Veo/Seedance） |

**数据格式适配**：

- game-director-pro 分镜格式：
  ```json
  { "shot_id": "01", "video_prompt": "...", "duration": 4, "asset_source": "ai_generate" }
  ```
- QAS `generate-multishot` 期望：
  ```json
  { "index": 0, "durationSeconds": 5, "prompt": "...", "imageBase64": "..." }
  ```
- 需写适配器：`shot_id` → `index`，`video_prompt` → `prompt`，首帧图 → `imageBase64`。

---

### 方式 C：视频引擎统一（可选）

**现状**：

- game-director-pro：火山 Ark Seedance（`call_kling_api.py`）
- QAS：Compass Veo（`veo_generate.py`）

**选项**：

1. **保留双引擎**：game-director-pro 继续用 Seedance；QAS H5 继续用 Veo。互不干扰。
2. **QAS 增加 Seedance 路由**：参考 `docs/seedance2-api-reference.md`，新增 `POST /api/video/generate-seedance`，供 game-director-pro 或 H5 调用。
3. **game-director-pro 支持 Veo**：修改 `call_kling_api.py` 或新增 `call_veo_api.py`，通过环境变量切换引擎。

---

### 方式 D：首帧/尾帧与分镜图打通

**现状**：

- game-director-pro：每镜**首帧 + 尾帧**两张图，用 `generate_frame_images.py` 调火山 Ark 文生图。
- QAS：`POST /api/storyboard/images` 每镜只出一张分镜图，用 Compass Imagen。

**整合思路**：

1. **扩展 storyboard API**：新增 `POST /api/storyboard/frames`，接受 `{ shots: [{ firstFramePrompt, lastFramePrompt }] }`，对每镜调两次 Imagen，返回 `firstFrame`、`lastFrame` base64。
2. **game-director-pro 脚本可选**：增加 `--api-url` 参数，指向 `http://localhost:3001/api/storyboard/frames`，用 QAS 生图替代火山。
3. **格式统一**：game-director-pro 的 `frames_batch.json` 与 QAS 的 shots 格式做映射。

---

## 三、素材库路径配置

| 来源 | 默认路径 | QAS 对应 |
|------|----------|----------|
| game-director-pro | `\\10.21.100.89\Project Krad\GNG Assets Library` | 无 |
| QAS | Google Drive | `config/assets.json`、Drive API |

**建议**：

- 在 QAS 的 `config/` 增加 `game-director-assets.json`，配置素材库路径。
- 或通过环境变量 `GAME_DIRECTOR_ASSET_LIBRARY` 覆盖默认 UNC 路径。
- 若希望统一用 Drive：需改 `asset_manager.py`，增加 Drive 搜索逻辑（或通过 QAS `POST /api/drive/search` 代理）。

---

## 四、推荐实施顺序

1. **先做方式 A**：复制 game-director-pro 到 `.cursor/skills/`，配置 `.env`，在 Cursor 对话中验证三阶段流程。
2. **再做方式 D**：扩展 `POST /api/storyboard/frames`，支持首帧/尾帧成对生成，供 game-director-pro 或 H5 使用。
3. **最后做方式 B**：按需新增 `/api/game-director/*` 路由，将 game-director-pro 流程封装为 API。

---

## 五、目录与配置速查

| 项目 | 路径 |
|------|------|
| game-director-pro | `C:\Users\wei.liu\Desktop\cursor_try\game-director-pro` |
| QAS 根目录 | `c:\Users\wei.liu\Desktop\cursor_try\QAS` |
| h5-video-tool-api | `QAS/h5-video-tool-api` |
| 建议 skills 位置 | `QAS/.cursor/skills/game-director-pro` |
| 环境变量 | `QAS/.env` 或 `game-director-pro/.env` |

---

## 六、相关文档

| 文档 | 说明 |
|------|------|
| `game-director-pro/安装与使用说明.md` | 安装与配置 |
| `game-director-pro/references/frame_image_api_guide.md` | 首帧/尾帧生图 API |
| `game-director-pro/references/kling_api_docs.md` | 火山 Ark 视频 API |
| `QAS/docs/QAS-pipeline-status.md` | QAS 流水线现状 |
| `QAS/docs/seedance2-api-reference.md` | Seedance API 参考 |
