# SESSION-ANCHOR — editor-agent-s1-postproduction-kit

> Run ID: `2026-04-20-editor-agent-s1-postproduction-kit`
> Sprint: S1（Week 1）
> 对应路线图条目：**EDA-01 / EDA-02 / EDA-03**

---

## 目标（一句话）

让市场人**不需要再手工做字幕、不需要再手工配爆款字幕样式、不需要再手工拼品牌片头片尾**。

## 本轮 3 个交付物

| ID | 功能 | 主要落地文件 |
|---|---|---|
| **EDA-01** | ASR 自动字幕（a1 → subtitles 轨，支持热词词典） | `h5-video-tool-api/src/services/asrService.ts`（新建）<br/>`h5-video-tool-api/src/routes/editorSubtitles.ts`（新建）<br/>`h5-video-tool/src/editor/components/AgentPanel.tsx`（指令触发） |
| **EDA-02** | 爆款字幕样式预设 | `h5-video-tool-api/src/editor/timelineSchema.ts`（扩 TextClip.style）<br/>`h5-video-tool/src/editor/utils/textClipPresets.ts`（新建预设库）<br/>`h5-video-tool/src/editor/components/TimelinePanel.tsx`（渲染）<br/>`h5-video-tool-api/src/services/ffmpegExport.ts`（导出支持）|
| **EDA-03** | 品牌片头片尾卡 | `docs/brand-kit.example.json`（模板）<br/>`h5-video-tool-api/src/services/brandKitService.ts`（新建）<br/>`h5-video-tool-api/src/services/editorAgentService.ts`（意图识别 + 插入） |

## 只读文件（只允许读，不允许改）

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## 本轮禁区

- 不改 `editorAgentService.ts` 的候选窗生成逻辑（`buildUniformCandidateWindows` / `prioritizeCenterWindows`）
- 不改 `editorHighlightCandidates.ts` 的战斗意图正则
- 不改 3 套叙事模板 `NARRATIVE_TEMPLATES`（Sprint 4 才扩展）

## 参考文件（只读，建立上下文）

- `docs/剪辑Agent优化路线图.md` — 总 roadmap
- `docs/剪辑Agent使用指南.md` — 已有能力 & 用户指令范例
- `h5-video-tool-api/src/editor/timelineSchema.ts` — TextClip 定义
- `h5-video-tool-api/src/services/editorAgentService.ts:1098-1170` — 合并策略
- `h5-video-tool-api/src/services/musicBeatAnalysis.ts` — 现有音频分析（参考 ASR 的 ffmpeg 调用方式）

## 通过门禁条件

- **Gate 2 Builder** 完成：三端一统编译通过（前端 `npm run build` + 后端 `npx tsc --noEmit`）
- **Gate 3 Verifier** 完成：3 条指令在线上环境跑通（见 planner-spec.md 测试矩阵）
- **Gate 5 Integrator**：更新 PRODUCT.md Changelog（v0.64），更新 `docs/剪辑Agent使用指南.md` 加上三项新指令示例

## 回滚点

- 如需紧急回滚：`git revert` 到本 Sprint 首个 commit 之前。
- 数据风险：`TextClip.style` 字段为新增 optional，不会破坏旧工程。
- `subtitles` 字段本就是数组，ASR 填充前会检查非空保护（和 v0.63 合并策略一致）。

---

**下一步**：进入 `planner-spec.md`。
