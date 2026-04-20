# Planner Spec — Sprint 1「后期三件套」

> Run: `2026-04-20-editor-agent-s1-postproduction-kit`
> Gate 1 产物。Challenger 评审通过后进入 Gate 2 Builder。

---

## 背景

当前剪辑 Agent 已具备"挑片段 + 按模板排片 + 自动配 BGM"的主线能力（`editorAgentService.ts`），但市场人日更出片的后期环节仍需手工：
1. 字幕要么 Agent 自己瞎编，要么手打 → **每条视频多花 15–30 分钟**
2. 文字轨 `TextClip` 只有朴素样式，没有 TikTok 爆款字幕观感 → **要手动配大字描边 / 颜色**
3. 没有品牌 Logo / CTA 模板 → **每条视频手动拼片头片尾**

Sprint 1 目标：三项同期落地，解放后期时间。

---

## EDA-01 ：ASR 自动字幕

### 目标

一条指令 `"给这段视频自动生成中文字幕"` → Agent 把 v1/a1 轨音频提给 ASR → 返回带时间戳的字幕 → 填入 `TimelineProject.subtitles`。

### 功能规格

1. **ASR 引擎选择（按优先级）**
   - 优先 Compass ASR（若 `COMPASS_ASR_ENABLED=1` 且对应 Key 可用）
   - 降级 Whisper.cpp CLI（`WHISPER_BIN` 指向本地可执行文件）
   - 以上都不可用 → 返回 501 + 明确错误提示，不尝试瞎编字幕

2. **音频源**
   - 优先从 `v1` 轨所有 VideoClip 的原视频里抽音（`ffmpeg -vn -ac 1 -ar 16000 -f s16le`）
   - 按 timeline 顺序串起来后送 ASR
   - 素材无音轨（`NO_AUDIO_STREAM`）→ 返回 `no_audio` 错误码

3. **时间戳校正**
   - ASR 返回的字幕是按串接后的音频时间算的，需要反推回 timeline 绝对时间（考虑 clip.speed）
   - 跨 clip 拼接点的句子自动在拼接点切分

4. **热词词典**
   - 环境变量 `EDITOR_ASR_HOTWORDS_FILE` 指向一个 JSON 文件，内含游戏术语/角色名清单
   - 送 ASR 请求时作为 hotwords 参数（Compass ASR 支持）或后处理纠错（Whisper 降级路径）

5. **语言选择**
   - 指令含"中文字幕" → `zh`；"英文字幕" → `en`；"日文" → `ja`；"泰文" → `th`；未指定按工程 locale 或默认 `zh`
   - Agent 意图识别扩展在 `editorAgentIntent.ts` 或新建 `subtitleIntent.ts`

### API 设计

**新建 `POST /api/editor/subtitles/asr`**

请求：
```json
{
  "projectId": "editor_xxx",
  "language": "zh" | "en" | "ja" | "th" | "es" | "pt",
  "hotwords": ["夜影", "五杀"]
}
```

响应：
```json
{
  "ok": true,
  "subtitles": [
    { "id": "sub_1", "startSec": 0.34, "endSec": 2.12, "text": "...", "language": "zh" }
  ],
  "usage": { "durationSec": 30.1, "engine": "compass|whisper" }
}
```

错误：
- `no_audio` — v1 轨所有 clip 均无音轨
- `asr_unavailable` — 两个引擎都不可用
- `project_not_found`

### 前端集成

- `AgentPanel.tsx`：用户发 `"加字幕"` / `"生成字幕"` 类指令 → 先走 `routeEditorAgentMessage` 判意图，识别为 `subtitle` 子分类后走新 ASR 路径（不触发 v1/a1 剪辑）
- 进度用 SSE 推送：`stage: 'asr'` percent 0→40（抽音）→ 80（ASR）→ 100（填入）
- UI 在字幕区域加"🎙 AI 生成字幕"按钮

### 验收标准（AC）

| # | 场景 | 预期 |
|---|---|---|
| AC-1 | 3 段有音轨素材，1 条"生成中文字幕"指令 | 字幕轨填入，时间戳误差 ±0.3s 以内 |
| AC-2 | 素材无音轨 | 明确提示"素材无音频，无法生成字幕" |
| AC-3 | 指令"生成英文字幕" | 字幕 language=en |
| AC-4 | 热词命中 | ASR 结果中 `夜影` 不被识别成 "影子" 之类的近音词 |
| AC-5 | 工程 subtitles 非空 | 提示"将覆盖现有字幕，是否继续？"（前端确认对话框） |
| AC-6 | v1 轨有 3 个 clip，第 2 个 speed=2x | 字幕时间戳正确反推（第 2 段字幕被压缩到一半时长） |

### 风险

- **Compass ASR 未上线**：需确认 Compass 是否提供 ASR。若未上线，S1 可能只能落 Whisper 降级路径。**行动项**：开工前先问管理员确认。
- **Whisper.cpp 部署**：服务器需安装 whisper.cpp 二进制和 ggml 模型文件（`ggml-base.bin` 或 `ggml-large.bin`），~1.5GB 磁盘。
- **长视频 ASR 耗时**：≥3 分钟视频 ASR 可能超 30s，需要 SSE 心跳 keepalive。

---

## EDA-02 ：爆款字幕样式预设

### 目标

`TextClip` 增加 `stylePreset` 字段，前端/后端共用。Agent 可根据指令关键词自动选样式，用户也能在时间轴 UI 上切换。

### 功能规格

1. **5 套预设**（由简到繁）
   - `classic` — 当前样式（白字黑描边底）兼容旧工程
   - `subtitle` — 标准字幕（底部 + 半透明黑条）
   - `tiktok_big` — TikTok 大字：白字粗黑描边 + 3% 抖动
   - `caption_yellow` — Shorts 黄字 + 加粗 + 中心偏下
   - `word_pop` — 逐词出现，关键词变色（粉/黄高亮）

2. **数据结构**（`timelineSchema.ts`）
   ```ts
   export type TextStylePreset =
     | 'classic'
     | 'subtitle'
     | 'tiktok_big'
     | 'caption_yellow'
     | 'word_pop';

   export interface TextClip {
     // ... 现有字段
     stylePreset?: TextStylePreset;  // 缺省 = 'classic'，向后兼容
     highlightWords?: string[];       // 仅 word_pop 使用
   }
   ```

3. **关键词 → 样式映射**（`textClipPresets.ts` 新建）
   ```
   tiktok / 抖音 / 爆款 / 大字            → tiktok_big
   shorts / yellow / 黄色字幕             → caption_yellow
   逐词 / 跳字 / 关键词变色 / word pop    → word_pop
   标准字幕 / 底部字幕                    → subtitle
   ```

4. **前端渲染**
   - `TimelinePanel.tsx` 预览区按 preset 渲染（CSS 类 + 可能的关键词 span）
   - UI 在文字轨 clip 上右键菜单加"样式预设"子菜单

5. **导出渲染**
   - `ffmpegExport.ts` 扩展：根据 preset 生成对应 ffmpeg `drawtext` / `subtitles` filter 参数
   - `word_pop` 预设通过 ASS 字幕 `\k` 卡拉 OK 标签实现逐词

### 验收标准（AC）

| # | 场景 | 预期 |
|---|---|---|
| AC-1 | Agent 指令含"爆款大字字幕" | TextClip.stylePreset = tiktok_big |
| AC-2 | 时间轴 UI 切换样式 | 预览立即变 + 保存到工程 |
| AC-3 | 导出 mp4 | 字幕样式与预览一致（抽关键帧对比） |
| AC-4 | 旧工程没有 stylePreset | 按 classic 渲染，不挂 |
| AC-5 | `word_pop` + highlightWords=['五杀','绝地'] | 成片中"五杀"/"绝地"高亮色，其余普通色 |

### 风险

- **ffmpeg drawtext 字体依赖**：服务器需安装 CJK 字体（如 Source Han Sans）。**行动项**：部署脚本补 `fonts-noto-cjk`。
- **CSS 渲染与 ffmpeg 渲染一致性**：不能 1:1 像素级对齐，但视觉上要像。

---

## EDA-03 ：品牌片头片尾卡

### 目标

一条指令 `"加上品牌片头片尾"` → Agent 在 timeline 首尾自动插入固定 clip（Logo 动画 / CTA 卡），并在文字轨叠对应文案。

### 功能规格

1. **品牌配置文件**
   - 新建 `docs/brand-kit.example.json`（示例，用户复制为 `brand-kit.json` 放 `h5-video-tool-api/data/` 下）
   - 或环境变量 `BRAND_KIT_FILE` 指向路径
   - 结构：
     ```json
     {
       "intro": {
         "videoAssetId": "editor_asset_logo_intro",
         "durationSec": 1.5,
         "textOverlay": { "text": "GAME NAME", "stylePreset": "tiktok_big" }
       },
       "outro": {
         "videoAssetId": "editor_asset_cta_outro",
         "durationSec": 2.5,
         "textOverlay": { "text": "立即下载", "stylePreset": "caption_yellow" },
         "ctaLink": "https://example.com/download"
       }
     }
     ```

2. **后端服务**（`brandKitService.ts`）
   - `loadBrandKit()` — 读配置，校验引用的 asset 存在
   - `insertBrandIntroOutro(project, options)` — 在 v1 首/尾插入 videoAssetId 对应的 clip，对应时长；在 t1 轨同时间段叠 textOverlay
   - 时长变化传播：durationSec += intro + outro；后续所有 clip timelineStart 顺延

3. **Agent 意图**
   - `editorAgentService.ts` 扩展：检测到 `品牌 / 片头 / 片尾 / intro / outro / 开场卡 / 结尾卡 / Logo / CTA` 关键词
   - 识别后在原剪辑结果之上调用 `insertBrandIntroOutro`
   - **独立指令**：`"给现有工程加品牌片头片尾"` 不重新剪，只插入

4. **前端入口**
   - AgentPanel 的快捷指令区（没有就顺手加一个）给个"加品牌片头片尾"按钮

### 验收标准（AC）

| # | 场景 | 预期 |
|---|---|---|
| AC-1 | brand-kit.json 缺失 | 返回"未配置品牌物料"错误，不挂 |
| AC-2 | 对空工程发"加品牌片头片尾" | 返回"请先剪辑或导入素材"错误 |
| AC-3 | 对已有成片工程发指令 | v1 首尾各多一个 clip，durationSec 正确加 4s |
| AC-4 | 重复发同一指令 | 幂等：不会叠两份片头 |
| AC-5 | 剪辑指令 + 品牌词同时出现 | Agent 先剪再加品牌卡 |
| AC-6 | ffmpeg 导出 | Logo 片头 + CTA 片尾均出现在成片正确位置 |

### 风险

- **brand-kit 模板资产**：需要先上传一段 Logo 动画视频作为 intro asset，一段 CTA 动画作为 outro asset。开工时可先用占位素材。
- **幂等检测**：如何判定"已经有品牌卡"？→ 用 `clip.meta.source = 'brand-kit-intro'` 标记。

---

## 测试矩阵（Gate 3 Verifier 要跑的）

| 类别 | 用例 | 覆盖 EDA |
|---|---|---|
| 正向 | 3 条指令分别单发 + 组合发 | 01/02/03 |
| 正向 | 跨比例（9:16 / 16:9）各测 1 条 | 01/02/03 |
| 异常 | 素材无音轨 + 生成字幕 | 01 |
| 异常 | ASR 服务不可用 | 01 |
| 异常 | 未配置 brand-kit | 03 |
| 异常 | 旧工程无 stylePreset | 02 |
| 性能 | 3 分钟视频 ASR 耗时 < 30s | 01 |
| 性能 | 导出多字幕样式 mp4 时长 < 1.5x 原视频 | 02 |
| 兼容 | 老工程打开不报错 | 01/02/03 |
| 幂等 | 重复发品牌卡指令 | 03 |

---

## 依赖 & 前置问题

**需要提前确认（Challenger 阶段回答）**

1. **Compass ASR 可用性**：Compass 平台是否已提供 ASR 接口？接口地址、鉴权方式？
2. **服务器字体**：`43.134.186.196` 是否已装 CJK 字体？未装需 apt install。
3. **Whisper.cpp 二进制**：若走降级路径，谁负责部署 whisper 二进制和 ggml 模型？
4. **品牌物料**：首期 brand-kit 里的 intro / outro 视频由谁提供？先用 AI 生成占位？
5. **.env 新变量登记**：
   - `COMPASS_ASR_ENABLED`、`COMPASS_ASR_KEY`
   - `WHISPER_BIN`、`WHISPER_MODEL_PATH`
   - `EDITOR_ASR_HOTWORDS_FILE`
   - `BRAND_KIT_FILE`
   必须先写进 `.env.example` 再在代码里引用（CLAUDE.md 禁区规则）。

---

## Gate 1 Planner 自检

- [x] 目标清晰（一句话能说出）
- [x] 每个 EDA 有独立 AC
- [x] 风险逐项列出
- [x] 测试矩阵覆盖六类（正向/异常/性能/兼容/幂等/组合）
- [x] 依赖/前置问题列在最后
- [x] 只读 / 禁区文件已在 SESSION-ANCHOR 声明
- [x] API 新增接口列齐 request/response/error code
- [x] 数据结构变更向后兼容（stylePreset 为 optional）

**交给 Challenger 评审**。
