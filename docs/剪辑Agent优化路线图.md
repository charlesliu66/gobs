# 剪辑 Agent 优化路线图（v0.64+）

> 面向市场人实际工作流的升级路线。跳过「数据回流」（原 P2-12），其余 15 项按性价比排 5 个 Sprint。
> 每项任务编号 `EDA-NN`，后续 planner-spec / commit / PR 统一引用该编号。

---

## 任务矩阵（一张表看全）

| ID | 任务 | 优先级 | Sprint | 预估人日 | 依赖 |
|---|---|---|---|---|---|
| **EDA-01** | ASR 自动语音识别字幕 | P0 | S1 | 2 | Compass ASR / Whisper |
| **EDA-02** | 爆款字幕样式预设（TikTok 大字 / 跳字 / 关键词变色） | P0 | S1 | 1.5 | — |
| **EDA-03** | 品牌片头片尾卡（brand-kit） | P0 | S1 | 1.5 | — |
| **EDA-04** | 多平台一次导出（9:16 / 16:9 / 1:1 / 4:5 同 timeline） | P0 | S2 | 2 | ffmpegExport |
| **EDA-05** | AB 变体批产（同素材出 N 条） | P0 | S2 | 2.5 | 现有 Agent |
| **EDA-06** | 营销术语词典（Hook/CTA/反转/病毒节奏 → intent 映射） | P1 | S3 | 1.5 | editorAgentService |
| **EDA-07** | 自动封面图挑选 + 爆款封面文案 | P1 | S3 | 1.5 | frameVisionRank |
| **EDA-08** | 社媒文案 + Hashtag 联动生成 | P1 | S3 | 1.5 | geelark-publish skill |
| **EDA-09** | 爆款参考反推（URL → 拆节奏 → 套到当前素材） | P1 | S4 | 4 | viral-agent skill |
| **EDA-10** | 热点 BGM 库 / TikTok 热歌接入 | P1 | S4 | 3 | compassLyriaMusic |
| **EDA-11** | 细分叙事模板库（新英雄 PV / 新皮肤 / 版本预告 / 活动预热 / 电竞复盘 / 病毒 Hook） | P1 | S4 | 3 | NARRATIVE_TEMPLATES |
| **EDA-12** | TTS 旁白（文案 → WAV → a3 轨） | P2 | S5 | 2 | Compass / ElevenLabs |
| **EDA-13** | 合规预检（TikTok / 抖音 / YouTube 红线） | P2 | S5 | 2 | — |
| **EDA-14** | 画中画 / 圈点高亮 / 箭头 overlay 轨 | P2 | S5 | 3 | timelineSchema |
| **EDA-15** | 转场特效 + 调色 LUT 预设 | P2 | S5 | 3 | ffmpegExport |

*（原 P2-12「数据回流学习」按用户决定跳过，保留编号以便未来回填。）*

**总预估：33.5 人日**（约 5 个自然周，单人节奏）

---

## Sprint 规划

### Sprint 1（Week 1）— 「后期三件套」：字幕 / 样式 / 品牌卡
- **EDA-01 ASR 字幕**：用 Compass ASR（没有则降级 Whisper.cpp）对 a1 轨音频转文字 → 填 `subtitles`
- **EDA-02 爆款字幕样式**：`TextClip.style` 增加 `tiktok_big / caption_yellow / word_pop / subtitle_classic` 预设
- **EDA-03 品牌卡**：`docs/brand-kit.json` 定义 Logo/CTA，Agent 听懂 `"加品牌片头片尾"` 自动插入
- **交付物**：3 条指令实测通过 + 一份"市场人指令小抄"更新到 `docs/剪辑Agent使用指南.md`
- **解锁**：每条视频后期时间从 ≥30 分钟降到 ≤5 分钟

### Sprint 2（Week 2）— 分发效率翻倍
- **EDA-04 多平台导出**：导出面板勾选多个比例，一次出 mp4 阵列
- **EDA-05 AB 变体批产**：`POST /api/editor/agent/variants` 一次返回 N 条不同 Hook / BGM / 节奏的 TimelineProject
- **交付物**：1 份工程 1 次操作 = 8 条可直接上传的成片（4 平台 × 2 变体）
- **解锁**：日更量级从 2–3 条 → 10+ 条

### Sprint 3（Week 3）— 市场语言对齐
- **EDA-06 营销词典**：`Hook / 钩子 / 前3秒 / CTA / 反转 / 情绪拉满 / 病毒节奏` → 内部模板映射
- **EDA-07 封面图**：视觉高分帧自动挑封面 + AI 配封面文案
- **EDA-08 文案标签联动**：导出面板直出 caption + hashtag（中/英/泰/西/葡）
- **交付物**：市场人按自己说话的方式就能精准控制剪辑；每条视频自带封面 + 文案 + 标签
- **解锁**：不用再开 3 个工具打配合

### Sprint 4（Week 4-5）— 爆款方法论
- **EDA-09 爆款反推**：发个 TikTok/抖音 URL，Agent 拆节奏/分镜 → 套到用户素材
- **EDA-10 热歌库**：内置 TikTok/抖音热门 BGM 片段库，指令支持 `"用最近火的那首 XX"`
- **EDA-11 细分模板**：6 套新模板进库（PV/皮肤/版本/活动/电竞/病毒）
- **解锁**：从"套模板出片"升级到"学爆款出片"

### Sprint 5（Week 6-7）— 专业度补全
- **EDA-12 TTS 旁白**：解说向、玩法介绍向宣传片刚需
- **EDA-13 合规预检**：导出前一键跑红黄绿灯
- **EDA-14 画中画 / 高亮**：功能讲解、玩法介绍常用
- **EDA-15 转场 + LUT**：硬切之外的冲击感转场 & 电影感/赛博朋克/复古色调
- **解锁**：对标剪映专业版能力

---

## 依赖关系图（简化）

```
EDA-01 ASR ──┐
EDA-02 字幕样式 ┼─→ EDA-08 文案标签（可直接用字幕做 caption 候选）
EDA-03 品牌卡 ──┘

EDA-04 多平台 ──→ EDA-05 AB变体（复用多平台导出管线）

EDA-06 营销词典 ──→ EDA-11 细分模板（词典触发模板选择）
EDA-07 封面     ──→ EDA-08 文案标签（封面文案联动）

EDA-09 爆款反推 ──→ EDA-11 细分模板（反推结果注册为新模板）
EDA-10 热歌库   ──→ 独立

EDA-14 overlay 轨 ──→ EDA-15 转场（均需扩 timelineSchema）
```

---

## 验收总 KPI（5 个 Sprint 合计）

| 指标 | 现状 | 目标 |
|---|---|---|
| 市场人剪 1 条 TikTok 风格视频耗时 | ~45 分钟 | **≤ 8 分钟** |
| 1 次操作产出成片数 | 1 | **8（4 平台 × 2 变体）** |
| 需要手动后期的环节 | 字幕 / 封面 / 文案 / 多平台裁 / Logo / 标签 | **全部自动化** |
| Agent 指令词汇匹配度 | 战斗/角色向词 | **覆盖市场语言（Hook/CTA/反转 等）** |
| 细分场景模板 | 3 | **9（+新英雄/皮肤/版本/活动/电竞/病毒）** |
| 爆款复刻能力 | ❌ | **✅（URL 反推）** |
| 导出格式 | mp4/mov 单比例 | **多比例批量 + 封面 PNG + 文案 + 标签** |

---

## 工作流约定

- 每个 Sprint 建一个 run 目录：`docs/workflow/runs/2026-04-XX-editor-agent-s<N>-<feature>/`
- 遵循 CLAUDE.md 的 4+1 门禁（Planner → Challenger → Builder → Verifier → Integrator）
- 每个 EDA-NN 在 PRODUCT.md Changelog 对应一个 bullet
- Sprint 完结后更新 `docs/daily-reports/YYYY-MM-DD.md`

---

## 下一步

**Sprint 1 的 run 目录已建好**：`docs/workflow/runs/2026-04-20-editor-agent-s1-postproduction-kit/`

- `SESSION-ANCHOR.md` — 本轮锚点
- `planner-spec.md` — 3 个任务（EDA-01/02/03）的 AC、风险、测试矩阵

等你说 **"开始 Sprint 1"**，进入 Gate 2 Builder 阶段开动。

---

*制定时间：2026-04-20*
*制定人：AI 助手（基于市场人视角需求梳理）*
