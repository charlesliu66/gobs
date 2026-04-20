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

1. **ASR 引擎**
   - 直接调 Whisper.cpp CLI（`WHISPER_BIN` 指向 `/home/ubuntu/whisper.cpp/build/bin/whisper-cli`）
   - 模型按 `WHISPER_MODEL_PATH`（默认 `ggml-base.bin`）；指令里显式要求"高精度字幕"时自动提升到 medium（如果存在）
   - 不可用 → 返回 501 + 明确错误提示，不尝试瞎编字幕

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

- ~~Compass ASR 未上线~~：已确认 Compass 不提供，直接走 Whisper.cpp。
- ~~Whisper.cpp 部署~~：✅ 已完成（服务器实测通过）。
- **长视频 ASR 耗时**：≥3 分钟视频转写约 40s，需要 SSE 心跳 keepalive（每 5s 发 progress 事件）。
- **base 模型对中文口语精度**：base 对中文识别一般，medium 会好很多但延迟 ×5。策略：默认 base + 指令 `"高精度字幕"` 自动切 medium（若已下载），未下载时返回友好提示教用户如何拉取。
- **多 clip 拼接 ASR**：必须在抽音时显式 `ffmpeg -filter_complex concat` 拼成单段 WAV，否则每段单独 ASR 会丢句首/句尾重叠。

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

- ~~ffmpeg drawtext 字体依赖~~：✅ 服务器已安装 `fonts-noto-cjk` + `fonts-noto-color-emoji`。
- **CSS 渲染与 ffmpeg 渲染一致性**：不能 1:1 像素级对齐，但视觉上要像。每个 preset 需要前端 CSS + 后端 ffmpeg filter 双份实现，需测试视觉一致性。
- **ASS 卡拉 OK 逐词高亮**：`word_pop` 预设需要 ASR 返回 word-level timestamps（Whisper.cpp 带 `-ml 1 --split-on-word` 可输出，需验证）。

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

- ~~brand-kit 模板资产缺失~~：✅ 改为三档方案（见"EDA-03 素材来源方案"）。Sprint 1 落 A + C 两档，A 档零依赖。
- **幂等检测**：如何判定"已经有品牌卡"？→ 用 `clip.meta.source = 'brand-kit-intro' / 'brand-kit-outro'` 标记，插入前先 filter 现有 clip。
- **ffmpeg 合成 intro/outro mp4**：需要生成脚本（给定 Logo PNG + 文字 + 主色 → 输出 mp4）并缓存结果。缓存键 = sha256(logo + text + color + style)，避免每次重复生成。

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

## 依赖 & 前置问题（2026-04-20 全部确认完毕）

| # | 问题 | 结论 |
|---|---|---|
| 1 | Compass ASR 可用性 | ❌ 不提供，确定走 **Whisper.cpp 降级路径**（就是主路径） |
| 2 | 服务器 CJK 字体 | ✅ 已安装 `fonts-noto-cjk` + `fonts-noto-color-emoji`（apt 确认装好） |
| 3 | Whisper.cpp 部署 | ✅ 已部署于 `/home/ubuntu/whisper.cpp/`，二进制 `build/bin/whisper-cli`，模型 `ggml-base.bin`（142MB），JFK 11s 冒烟测试 2.4s 完成 |
| 4 | 品牌物料 | ✅ 采用 **"AI 生成占位 + 用户可替换"** 的混合模式（详见下方"EDA-03 素材来源方案"） |
| 5 | .env 新变量登记 | ✅ 已写入 `.env.example`（含 WHISPER_BIN / WHISPER_MODEL_PATH / WHISPER_MODEL_SIZE / WHISPER_THREADS / EDITOR_ASR_HOTWORDS_FILE / BRAND_KIT_FILE） |

### EDA-03 素材来源方案（Q4 完整版）

市场人不需要"买一套素材"也能立即用上，分三档落地：

**档位 A：零素材即可用（MVP 默认）**
- 完全用 ffmpeg 合成静态动画：黑底 → Logo PNG（用户上传一张）淡入 1s → 文字"GAME NAME"上滑 → 黑场收尾
- 不需要任何 AI 视频能力
- 生成后缓存为一段固定 mp4（1.5s intro / 2.5s outro），挂进 editor assets
- 用户配置：只需给一张 Logo PNG + 品牌名 + 主色

**档位 B：AI 生成（品质向）**
- 复用已有的 VEO / Dreamina / Seedance 能力
- 在品牌配置里写提示词：`"电影感品牌片头，粒子汇聚成 Logo，1.5 秒"`
- 一次生成多版，用户挑一条永久绑定（复用到后续所有工程）
- 成本：每次生成约消耗 1 个 VEO 配额

**档位 C：用户自备素材**
- 用户上传自己的 intro.mp4 / outro.mp4 → 写进 brand-kit.json
- 自由度最高，给有品牌素材库的团队用

**实现优先级**：
- Sprint 1 落地 **档位 A**（零依赖，秒级生效，保证大家都能用）
- Sprint 1 同时支持档位 C 的"文件路径直接引用"（实现几乎免费）
- 档位 B 放到 Sprint 4（EDA-11 细分模板库）一起做，因为它本质是"模板化 VEO 调用"

### 服务器已就绪的资源清单

以下已部署，Builder 阶段可直接引用：
```
/home/ubuntu/whisper.cpp/
├── build/bin/whisper-cli          # 可执行（支持 flac/mp3/ogg/wav）
├── build/bin/whisper-server       # HTTP 服务模式（备用）
├── models/ggml-base.bin           # 默认多语种模型，142MB
└── samples/jfk.wav                # 冒烟测试音频

系统包：
- fonts-noto-cjk, fonts-noto-color-emoji（CJK 渲染）
- cmake 3.28（未来扩编译需求）
- build-essential（已有）
```

### 性能基线（服务器实测）

- 硬件：AMD EPYC 9754 × 4 核，7.4GB RAM，无 GPU
- ggml-base.bin + 4 线程：**转写耗时 ≈ 音频时长 × 0.21**
  - 11s 音频 → 2.4s
  - 30s 视频 → ~6s
  - 3 分钟视频 → ~40s
- 走 SSE 推 progress，前端无需傻等

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
