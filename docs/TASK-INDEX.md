# GOBS / QAS Task Index

## 2026-05-08 Current Mainline Addendum

- `Campaign Output Workbench + Game Source Assets` is the next Campaign Mission Control direction after the completed Distribution Handoff MVP.
- The default post-brief user surface should show deliverables, required game source assets, GOBS production capability, and capability gaps instead of internal System Plan reasoning.
- Phase 1 implementation run is active at `docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/`, covering deterministic output plans, owner-scoped persistence, Workbench UI, and distribution bridge.
- Phase 2A implementation run is active at `docs/workflow/runs/2026-05-08-campaign-output-production-adapters/`, covering safe text/post production adapters and produced-item distribution package bridging.
- Phase 2B optimization run is active at `docs/workflow/runs/2026-05-08-campaign-output-one-click-production/`, reducing Output Workbench confirmation friction so one primary action saves and produces supported outputs.
- Phase 3 source asset readiness run is active at `docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/`, connecting Output Workbench source requirements to Asset Library candidates, row-level selection, and upload routing.
- Advanced Studio template optimization Phase 1 is active at `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/`, reducing Studio creation to Quick Single, Motion Transfer, and Character Showcase while parking heavier AI image/BGM/model work for later phases.
- Source docs:
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md`
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md`
  - `docs/plans/2026-05-08-campaign-output-production-adapters-design.md`
  - `docs/plans/2026-05-08-campaign-output-production-adapters-plan.md`

> 最后更新：2026-05-07
> 用途：作为当前项目入口，快速判断“现在该看什么、主线往哪里走、哪些 run 仍然有效”。

---

## 当前状态

- 最新发布主线以 `/api/system/version` 和 `origin/main` 为准；当前阶段已经接入真实 `Gold and Glory` canonical fastpublish brain。
- 当前产品北极星：`Campaign Creative Agent` 必须从 campaign brief 出发，产出创意素材或变体，并把它们送入分发。
- 当前默认受众：市场和运营同学；专业剪辑、制片和深度调参能力保留在 `Advanced Studio`，不再定义默认体验。
- 当前最值得继续推进的方向：
  1. `Campaign Creative -> Distribution Handoff MVP`：把 mission-first generated brief、选中的 campaign variant / asset / CTA / routed knowledge context 送入待发布包。
  2. `Human Feedback Loop Phase 0`：先记住人工判断，不假装短期已有投放效果监控。
  3. `Gold and Glory Brain Refresh Workflow`：让后续 fastpublishing 更新能被稳定 diff、刷新和记录版本。

---

## 必读文档

### 1. 项目运行规则

- [AGENTS.md](../AGENTS.md)：项目级强制规则、发布 SOP、禁区文件和 4+1 工作流。
- [.claude/memory/feedback.md](../.claude/memory/feedback.md)：历史事故、行为规则和自检清单。
- [docs/CODEX-CLI-PROJECT-GUIDE.md](CODEX-CLI-PROJECT-GUIDE.md)：长版项目指南，适合复杂任务补齐上下文。

### 2. 产品与版本现状

- [PRODUCT.md](../PRODUCT.md)：功能总览和产品侧 changelog。
- [CHANGELOG.md](../CHANGELOG.md)：近期 release history，后续版本流水优先写这里。
- [docs/plans/README.md](plans/README.md)：跨 run 设计稿和实施计划入口。

### 3. 当前主线方案

- [2026-05-07-campaign-to-distribution-handoff-mvp-design.md](plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md)：把 OpenClaw 产品/代码评估收敛成 `Campaign Creative -> Distribution Package -> 分发` 的下一步优化方案。
- [2026-05-06-campaign-creative-agent-next-phase-design.md](plans/2026-05-06-campaign-creative-agent-next-phase-design.md)：Campaign Creative Agent 的受众、形态和长期主链路。
- [2026-05-06-campaign-mission-control-phase0-implementation-plan.md](plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md)：Mission Control Phase 0 的产品骨架。
- [2026-05-06-gobs-fastpublish-knowledge-integration-design.md](plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md)：fastpublish 知识如何进入 GOBS。
- [2026-05-07-gold-and-glory-canonical-brain-sync-design.md](plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md)：真实 Gold and Glory Brain 的 source whitelist、checksum 和刷新边界。

---

## 近期重要 run

| Run | 作用 | 状态 |
|---|---|---|
| `2026-05-09-advanced-studio-template-optimization` | Advanced Studio Phase 1: template cleanup, Motion Transfer / Character Showcase repositioning, Quick Single inspirations, and baseline duration/aspect options | Committed/pushed to main @ `aab3fa3`; staging deploy blocked on missing local deploy credentials |
| `2026-05-09-campaign-source-asset-readiness` | Campaign Output Workbench Phase 3: source asset candidates, row-level selection, and Asset Library upload routing for required game source assets | Committed/pushed to main; release sync pending |
| `2026-05-08-campaign-output-one-click-production` | Campaign Output Workbench Phase 2B: one primary action saves the plan and produces supported text/post drafts before distribution handoff | Builder/Verifier complete locally; pending release sync |
| `2026-05-07-campaign-to-distribution-handoff-mvp` | 下一步主线：把 mission-first generated brief、选中 campaign variant / CTA / routed knowledge context 送入待发布包并进入分发 | Gate 1 planner-spec 已按 `a94a7f5` mission-first 基线对齐，待 Challenger/Builder |
| `2026-05-07-campaign-mission-first-autopilot` | Mission-first Campaign Creative：mission 生成 Brief，后端自动路由 Gold and Glory Brain，隐藏主链路 pack 选择 | 已发布到 staging/prod @ `a94a7f5` |
| `2026-05-07-gold-and-glory-canonical-brain-sync` | 把真实 fastpublishing 内容导入持久化 Gold and Glory Brain | 已发布到 staging/prod |
| `2026-05-07-gold-and-glory-single-brain-phase0` | 收掉多项目 demo 心智，默认只服务 Gold and Glory | 已完成 |
| `2026-05-07-campaign-mission-control-phase0` | 把默认体验改成面向市场/运营的 Campaign Mission Control | 已完成 |
| `2026-05-07-campaign-advanced-studio-phase1` | 下沉 Advanced Studio，不让专业工具抢默认主链路 | 已完成 |
| `2026-05-07-docs-mainline-sync` | 同步 campaign / knowledge / workflow 模板文档 | 已完成 |
| `2026-05-07-production-english-reference-ux` | Advanced Production 英文 reference-image UX 修复 | 已完成 / 非当前产品主链路 |

---

## 暂停或不作为当前主线

- `production-english-reference-ux` 属于 Advanced Studio 英文体验清理，已由并行修复完成；它不是当前 Campaign Creative Agent 主链路，后续不应抢占默认下一轮优化。
- 4 月下旬的稳定性、i18n、Production Wizard 收口任务仍可回溯，但不再作为当前默认任务入口。

---

## 文档维护约定

- 每次产品方向发生变化后，优先同步本文件，避免任务入口继续指向旧主线。
- 长期设计放 `docs/plans/`，单次执行证据放 `docs/workflow/runs/<run-id>/`。
- 代码或线上行为变更必须同步 `PRODUCT.md` 和 `CHANGELOG.md`；纯文档治理也应在近期 changelog 中留痕。
