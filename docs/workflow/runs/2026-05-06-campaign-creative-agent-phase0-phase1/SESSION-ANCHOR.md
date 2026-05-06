# SESSION-ANCHOR - 2026-05-06-campaign-creative-agent-phase0-phase1

> Run ID: `2026-05-06-campaign-creative-agent-phase0-phase1`
> Date: 2026-05-06
> Source plans:
> - `docs/plans/2026-05-01-campaign-creative-agent-implementation-plan.md`
> - `docs/plans/2026-04-22-tiktok-game-creative-agent-design.md`

## Run Summary

- Run ID: `2026-05-06-campaign-creative-agent-phase0-phase1`
- Goal: 把 GOBS 第一阶段收口成更明确的 `Campaign Creative Agent`，打通 `首页 / 导航 -> Campaign Creative -> brief -> strategy -> Editor handoff` 最小主链路。
- Owner: Codex
- Branch or commit context: `codex/campaign-creative-phase0-phase1@afe0d47+`
- Last updated: `2026-05-06T00:00:00+08:00`

## Acceptance Criteria Snapshot

- AC-01: 首页和导航完成 `Campaign Creative` 主心智收口，且原 `Studio / Editor / Distribute` 入口不回归。
- AC-02: `/campaign-creative` 页面可独立完成 brief 输入、strategy 生成，并支持 `Brand Content / TikTok UA` 模式切换。
- AC-03: brief / strategy 可稳定 handoff 到 `Editor`，首次 Agent 执行优先使用 handoff 上下文。
- AC-04: `region / forbiddenClaims` 前后端类型、prompt、handoff 链路保持一致。

## Editable Files (Builder Ownership)

- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool/src/App.tsx
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/components/campaign/
- h5-video-tool/src/editor/components/AgentPanel.tsx
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/src/editor/utils/editorCreativeBrief.ts
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool-api/src/routes/editorAgent.ts
- h5-video-tool-api/src/services/editorCreativeBrief.ts
- h5-video-tool-api/src/services/editorAgentService.ts
- PRODUCT.md
- CHANGELOG.md

## Read-Only References

- docs/TASK-INDEX.md
- docs/workflow/runs/2026-05-06-campaign-creative-agent-phase0-phase1/planner-spec.md
- docs/plans/2026-05-01-campaign-creative-agent-implementation-plan.md
- docs/plans/2026-04-22-tiktok-game-creative-agent-design.md

## Additional Forbidden Paths

- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- .env

## Out of Scope

- 不做真实 3-5 条 timeline variants 批量生成
- 不做 variant comparison board
- 不做 publish feedback / CTR / CVR / CPI 回流
- 不做长期 brief persistence
- 不做分发 orchestration 扩展
- 不改底层 video / image provider service

## Progress Checklist

- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules

- Escalate if a forbidden file must change.
- Escalate if a new env var is required.
- Escalate if acceptance criteria need to expand.
- Escalate before prod release approval.

## Goal

把 GOBS 第一阶段收口成一个更明确的“游戏营销创意生产系统 / Campaign Creative Agent”，只完成一条最小可交付主链路：

`首页 / 导航 -> Campaign Creative -> 填 brief -> 出 strategy card -> 进入 Editor`

## North Star

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

本 run 虽然只做到 `brief -> strategy -> editor handoff`，还没有进入真正分发，但所有设计决策都要服从这条最终产品形态。

如果某个改动只是让局部编辑体验更顺手，却没有让系统更接近 `brief -> asset/variant production -> distribution`，就不应被视为本方向的核心进展。

本 run 结束时，市场同学应当可以：

1. 从首页明确理解 GOBS 的主定位不是泛视频工具，而是 campaign creative 系统。
2. 从顶层 `Campaign Creative` 页面进入，而不是先进入 `Editor`。
3. 填写一份结构化 creative brief。
4. 得到一张可读、可复核的 creative strategy card。
5. 一键把 brief 和 strategy 带入 `Editor`，由 Agent 接力完成第一版创意剪辑。

## Success Boundary

本 run 的成功边界不是“完成多变体创意工厂”，而是先完成主入口与主心智切换，并打通市场用户的 first-touch 主链路。

成功定义：

- 首页主路径完成重构。
- 顶层 `Campaign Creative` 路由可进入。
- `Campaign Creative` 页面可独立完成 brief 输入与 strategy 生成。
- 从 `Campaign Creative` 到 `Editor` 的 handoff 不丢失 brief / strategy。
- `Editor` 首次执行时会优先使用 handoff 上下文。
- 现有 `Studio / Editor / Distribute` 主链路不回归。

## Slice Plan

### Slice A / Phase 0

目标：定位收口与入口重建。

主要交付：

- 首页主心智从“做视频”改成“做创意测试包 / Campaign Creative”。
- 新增顶层 `Campaign Creative` 导航和路由。
- 首页保留三条清晰路径：
  1. `快速验证创意`
  2. `Campaign Creative`
  3. `高级制片`
- 首页示例、文案、 quick ideas 全部切换到游戏营销语境。

### Slice B / Phase 1

目标：建立 `Brief -> Strategy Card -> Editor Handoff` 主链路。

主要交付：

- `Campaign Creative` 页面支持填写结构化 brief。
- 支持两种模式：
  - `Brand Content`
  - `TikTok UA`
- 页面展示 strategy card。
- 一键进入 `Editor`，把 brief / strategy 带入现有 Agent 流程。
- `Editor` 侧继续允许在面板内微调 brief，但不再要求用户先从时间轴思维开始。

## Locked Decisions

以下口径在本 run 内锁定，不再扩展：

- 路由名固定为 `/campaign-creative`。
- UI 模式名使用：
  - `Brand Content`
  - `TikTok UA`
- 内部枚举继续沿用：
  - `tiktok_content`
  - `tiktok_ua`
- Phase 1 不做真实多变体 timeline 批产。
- Phase 1 不做 variant comparison board。
- Phase 1 不做发布表现回流。
- Phase 1 不做服务端 brief 库。
- `Campaign Creative` 页面首版只保留一个主 CTA：`去生成创意剪辑`。
- `region` 进入 brief 数据结构，但只放在 `Advanced options`，且为可选字段。
- `forbiddenClaims` 的用户可见文案统一为 `风险禁区`，内部字段名保持 `forbiddenClaims`。
- `风险禁区` 放在 `Advanced options`，且为可选字段。
- 页面间 handoff 允许使用 `sessionStorage` 或等价轻量状态机制。
- `Editor` 是接力器，不是本 run 的主入口。

## Non-Goals

本 run 明确不做：

- 不做 3-5 条真实 timeline variants 批量生成。
- 不做 variant pack / variant comparison board。
- 不做 publish feedback / CTR / CVR / CPI 回流。
- 不做 game binding / campaign 主数据系统。
- 不做后端长期 brief persistence。
- 不扩展分发平台编排。
- 不重做整套 H5 视觉系统。
- 不修改底层视频 / 图像生成 provider 服务。
- 不改部署脚本、shared-data 迁移、release guard 主流程。

## Forbidden Files

本 run 不允许修改：

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `.env`
- 任何部署凭据、服务器密码、token 配置文件

## Primary File Scope

同 `Editable Files (Builder Ownership)`，本 run Builder 不应越出以上路径修改代码。

## Acceptance Commands

```bash
cd h5-video-tool-api
npx tsc --noEmit

cd ../h5-video-tool
npm run build
```

如补充 helper-level 测试，可增加：

```bash
node --test <targeted test file>
```

## Manual Verification Checklist

### Phase 0

- 首页首屏主文案明确指向 `Campaign Creative Agent`。
- 首页三条主路径清晰可见。
- 首页 quick ideas 全部为游戏营销语境。
- 顶层导航出现 `Campaign Creative`。
- `/campaign-creative` 路由可进入，且不影响原导航高亮和跳转。

### Phase 1

- `Campaign Creative` 页面可完成 brief 填写。
- `Brand Content` / `TikTok UA` 切换有明确差异化文案。
- strategy card 可生成并可读。
- 点击主 CTA 后能进入 `Editor`。
- 进入 `Editor` 后 brief / strategy 不丢失。
- 首次 Agent 执行时优先采用 handoff brief。
- 不需要用户先理解 timeline 才能发起第一轮创意任务。

## Release Requirement

Release 必须遵循现有 `staging -> verification -> prod` 流程：

1. 完成代码与文档更新。
2. 本地 build / typecheck 通过。
3. 部署 staging 并完成人工验证。
4. staging 验证通过后再进入 prod。
5. prod 验证通过后恢复 deployment state 为 `idle`。

## Current Notes

- 本 run 允许将部分“未来 variant pack 能力”只作为信息架构或占位文案出现，但不得伪装成已完成能力。
- 如果 `Campaign Creative` 页面需要使用新的本地 state / session handoff，必须保持失败时可回退到现有 `Editor` 逻辑。
- 如发现必须新增服务端持久化接口才能完成核心路径，应先停下并重新确认范围，而不是自动扩 scope。
