# Campaign Strategy Productization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 Campaign Creative 的 strategy card 升级为可复用的 strategy 对象，并把 richer strategy 字段贯通到 editor handoff 和 prompt 链路。

**Architecture:** 前端继续以 brief-first 流程生成 strategy，但补齐 `briefId / strategyId` 和下游消费字段；Editor 通过 session handoff 恢复 richer strategy；后端继续复用现有 `/api/editor/agent/apply` 链路，只扩展 normalize 与 prompt 生成逻辑，不引入服务端持久化。

**Tech Stack:** React, TypeScript, Vite, Express, existing editor creative brief utilities

---

### Task 1: 锁定 strategy 数据模型

**Files:**
- Modify: `h5-video-tool/src/components/campaign/model.ts`
- Modify: `h5-video-tool/src/components/campaign/strategy.ts`
- Modify: `h5-video-tool/src/api/editorCreative.ts`
- Modify: `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- Modify: `h5-video-tool-api/src/services/editorCreativeBrief.ts`

**Step 1:** 为 brief 和 strategy 定义稳定字段，统一 `briefId / strategyId / targetAudience / sellingPointFocus / ctaType / riskNotes`。

**Step 2:** 在 Campaign Creative 侧生成 IDs 和 richer strategy 字段，不引入后端持久化。

**Step 3:** 让前端和后端的 normalize 逻辑都接受并保留这批字段。

**Step 4:** 运行类型检查相关命令确认接口一致。

### Task 2: 升级 strategy card 展示

**Files:**
- Modify: `h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx`
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1:** 调整 strategy card，让其展示 richer strategy，而不是只展示 hook/cta/rationale 的最小集合。

**Step 2:** 优先突出 `angle`、`recommendedHook`、`sellingPointFocus`、`tone`、`assetNeeds`、`riskNotes`。

**Step 3:** 保持 CTA 明确，仍然是一键进入 Editor。

### Task 3: 打通 richer strategy handoff

**Files:**
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Modify: `h5-video-tool/src/editor/components/AgentPanel.tsx`
- Modify: `h5-video-tool-api/src/routes/editorAgent.ts`
- Modify: `h5-video-tool-api/src/services/editorAgentService.ts`

**Step 1:** 扩展 handoff payload 与 handoff normalize，保留 richer strategy 字段。

**Step 2:** 在 Editor 面板中显示最关键的 strategy 摘要，避免用户重新理解 brief。

**Step 3:** 确认 apply/apply-stream 请求继续携带 creative strategy，且字段在后端不丢失。

### Task 4: 让 prompt 消费 richer strategy

**Files:**
- Modify: `h5-video-tool-api/src/services/editorCreativeBrief.ts`
- Modify: `h5-video-tool-api/src/services/editorAgentService.ts`

**Step 1:** 扩展 `buildCreativeBriefPromptBlock`，把 strategy 的 angle、tone、asset needs、risk notes 编入 prompt。

**Step 2:** 保证 default user message 仍然能在只有 brief 的情况下工作，但当 strategy 存在时优先消费 richer strategy。

**Step 3:** 保留 `region / forbiddenClaims` 在 prompt 路径中的现有作用。

### Task 5: 验证与收尾

**Files:**
- Modify: `docs/workflow/runs/2026-05-06-campaign-strategy-productization/builder-report.md`
- Modify: `docs/workflow/runs/2026-05-06-campaign-strategy-productization/verifier-report.md`
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`

**Step 1:** 运行：

```bash
cd h5-video-tool-api
npx tsc --noEmit

cd ../h5-video-tool
npm run build
```

**Step 2:** 手动验证：
- `Campaign Creative -> 生成 strategy -> 进入 Editor`
- richer strategy 是否完整显示与恢复
- 首次 creative edit 是否继续可用

**Step 3:** 回写 builder/verifier 文档，并更新 `PRODUCT.md` / `CHANGELOG.md`。
