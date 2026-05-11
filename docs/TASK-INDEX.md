# GOBS / QAS Task Index

## 2026-05-08 Current Mainline Addendum

- `Campaign Output Workbench + Game Source Assets` is the next Campaign Mission Control direction after the completed Distribution Handoff MVP.
- The default post-brief user surface should show deliverables, required game source assets, GOBS production capability, and capability gaps instead of internal System Plan reasoning.
- Phase 1 implementation run is active at `docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/`, covering deterministic output plans, owner-scoped persistence, Workbench UI, and distribution bridge.
- Phase 2A implementation run is active at `docs/workflow/runs/2026-05-08-campaign-output-production-adapters/`, covering safe text/post production adapters and produced-item distribution package bridging.
- Phase 2B optimization run is active at `docs/workflow/runs/2026-05-08-campaign-output-one-click-production/`, reducing Output Workbench confirmation friction so one primary action saves and produces supported outputs.
- Phase 3 source asset readiness run is active at `docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/`, connecting Output Workbench source requirements to Asset Library candidates, row-level selection, and upload routing.
- Advanced Studio template optimization Phase 1 is active at `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/`, reducing Studio creation to Quick Single, Motion Transfer, and Character Showcase while parking heavier AI image/BGM/model work for later phases.
- Distribution Center operator MVP is active at `docs/workflow/runs/2026-05-09-distribution-center-ops-mvp/`, reducing duplicate Campaign inputs, adding account groups, and making platform copy/account mapping visible.
- Distribution Center publish history follow-up is active at `docs/workflow/runs/2026-05-09-distribution-publish-history-filters/`, adding frontend-only history filters and date grouping without touching GeeLark publish APIs.
- Campaign to Studio production bridge is active at `docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/`, connecting eligible Campaign Output video items to Advanced Studio and adding unified Asset Library reference slots.
- Current optimization recommendation is recorded at `docs/plans/2026-05-09-gobs-current-state-optimization-recommendation.md`: prioritize `方案 C + 方案 A` (experience loop + safe reduction), and defer large state-management/component rewrites.
- Campaign Production Loop closeout is active at `docs/workflow/runs/2026-05-09-campaign-production-loop-closeout/`, preserving Campaign -> Studio handoff context through video generation and syncing linked packages back into publishable Distribution drafts.
- Release tooling hardening is active at `docs/workflow/runs/2026-05-09-release-tooling-hardening/`, fixing Python 3.10 release helper compatibility and making SSH/SFTP deploy scripts finish deterministically.
- Distribution Center Step Refinement is active at `docs/workflow/runs/2026-05-09-distribution-step-refinement/`, splitting `/distribute` into asset, copy, accounts, and preflight/publish operator sections while preserving GeeLark publish behavior.
- Distribution Center Step Readiness Nav is active at `docs/workflow/runs/2026-05-09-distribution-step-readiness-nav/`, adding a compact four-step readiness overview and jump anchors without changing GeeLark publish behavior.
- Distribution Operator Happy Path Polish is active at `docs/workflow/runs/2026-05-09-distribution-operator-happy-path-polish/`, adding recent config restore, latest-batch next actions, compatible publish-history query/pagination/export, clearer publish error guidance, refresh-safe Campaign Output Plan writeback, a guarded GeeLark real-publish verifier, and a legacy-surface reduction audit.
- Release and Collaboration Governance is active at `docs/workflow/runs/2026-05-09-release-and-workflow-governance/`, implementing the Run 0 recommendation from the next optimization checklist: Dev Worker commit-only handoff, Release Owner pickup discipline, and safer large-archive upload fallback.
- Quality and Data Contract Foundation is merged at `a62a774`, giving Window B the three-state creative quality vocabulary plus Campaign/Asset/Output/Review/Package contracts.
- Story Video Review Capture is merged/deployed at `0c5134e`, implementing Window B Run 3 from the 2026-05-10 optimization checklist: human story-video quality marks, fixed issue tags, and Run 0 `ReviewContract`-compatible result-page review history.
- Asset Library Reuse MVP is merged/deployed at `9595f23`, implementing Window A Run 1 with team categories, preprocessing metadata, manual category correction, and `assetId`-based Run 0 `AssetContract` mapping.
- Banner Output MVP is merged/deployed at `ce212be`, implementing Window A Run 2: Banner specs, Asset Library source IDs, prompt placeholders, three-state quality marking, and non-publishable distribution package context.
- Quality Review And Next Version is merged/deployed at `e90c11e`, implementing Window A Run 4: human-signal quality diagnostics, fixed feedback tags, and traceable next-version drafts for Banner/copy outputs.
- Motion Transfer Validation is merged/deployed at `352e8bb`, implementing Run 5: 10-sample validation ledger, experimental/pause/continue decision, and Studio experimental entry hint.
- Character Showcase Validation is active at `docs/workflow/runs/2026-05-11-character-showcase-validation/`, implementing Run 6: 10-sample 5-character validation ledger, constrained continue decision, and Studio Character Showcase entry/preset guidance.
- Source docs:
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md`
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md`
  - `docs/plans/2026-05-08-campaign-output-production-adapters-design.md`
  - `docs/plans/2026-05-08-campaign-output-production-adapters-plan.md`
  - `docs/plans/2026-05-09-legacy-surface-reduction-audit.md`
  - `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`
  - `docs/plans/2026-05-10-creative-quality-and-data-contract.md`
  - `docs/plans/2026-05-10-asset-library-reuse-mvp.md`
  - `docs/plans/2026-05-10-banner-output-mvp.md`
  - `docs/plans/2026-05-10-quality-review-next-version.md`
  - `docs/plans/2026-05-10-motion-transfer-validation.md`
  - `docs/plans/2026-05-10-character-showcase-validation.md`

> 最后更新：2026-05-11
> 用途：作为当前项目入口，快速判断“现在该看什么、主线往哪里走、哪些 run 仍然有效”。

---

## 当前状态

- 最新发布主线以 `/api/system/version` 和 `origin/main` 为准；当前阶段已经接入真实 `Gold and Glory` canonical fastpublish brain。
- 当前产品北极星：`Campaign Creative Agent` 必须从 campaign brief 出发，产出创意素材或变体，并把它们送入分发。
- 当前默认受众：市场和运营同学；专业剪辑、制片和深度调参能力保留在 `Advanced Studio`，不再定义默认体验。
- 当前最值得继续推进的方向：
  1. `Campaign -> Studio -> Distribution` 体验闭环：Studio 生成结果要能稳定回填到 Campaign Package / Distribution 上下文。
  2. `Legacy Surface Reduction`：先审计并清理/隔离 `sj-ui`、`RiskSentiment/TiktokMatrix` 等非主线表面。
  3. `Distribution Center Step Refinement`：继续拆 `TabDistribute`，但围绕真实运营步骤拆，不做纯技术大重构。

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
| `2026-05-11-character-showcase-validation` | Run 6: 10-sample Character Showcase validation ledger, constrained continue decision, and Studio entry/preset guidance | Builder/Verifier in progress on branch `codex/2026-05-11-character-showcase-validation`; this window is also acting as Release Owner per user instruction |
| `2026-05-11-motion-transfer-validation` | Run 5: 10-sample Motion Transfer validation ledger, experimental/pause/continue decision, and Studio experimental entry hint | Merged/deployed @ `352e8bb`; Run 6 starts from this base |
| `2026-05-10-quality-review-next-version` | Window A Run 4: human-signal quality diagnostics, fixed feedback tags, and traceable next-version drafts for Banner/copy outputs | Merged/deployed via Release Owner @ `e90c11e`; this run is the base for Run 5 |
| `2026-05-10-banner-output-mvp` | Window A Run 2: Banner specs, Asset Library source IDs, prompt placeholders, three-state quality marking, and non-publishable Distribution Package context | Merged/deployed via Release Owner @ `ce212be`; this run is the base for Run 4 |
| `2026-05-10-asset-library-reuse-mvp` | Window A Run 1: Asset Library team categories, preprocessing metadata, manual category correction, and Run 0 `AssetContract` references by `assetId` | Merged/deployed via Release Owner @ `9595f23`; this run is the base for Run 2 |
| `2026-05-10-story-video-review-capture` | Window B Run 3: human story-video quality marks, fixed issue tags, and Run 0 `ReviewContract`-compatible result-page review history | Merged/deployed via Release Owner @ `0c5134e` |
| `2026-05-10-quality-data-contract-foundation` | Window A Run 0: minimal creative quality states, five-entity data contract, fixtures, and validation tests before Asset Library/Banner/Review work | Merged to `origin/main` @ `a62a774`; deployment remains Release Owner responsibility |
| `2026-05-09-release-and-workflow-governance` | Run 0 release/collaboration stabilization: commit-only Dev Worker handoff checklist plus bounded large-archive upload fallback for deployment scripts | Builder/Verifier in progress; deployment intentionally deferred to Release Owner window |
| `2026-05-09-distribution-step-readiness-nav` | Distribution Center readiness nav: compact four-step progress overview and jump anchors for asset/copy/accounts/publish | Verifier GO locally; eval PASS; commit/push and staging deployment next |
| `2026-05-09-distribution-operator-happy-path-polish` | Distribution operator happy path: recent config restore, latest-batch next actions, compatible history query/export, clearer publish errors, Output Plan writeback, and legacy-surface audit | Builder/Verifier in progress |
| `2026-05-09-distribution-step-refinement` | Distribution Center step refinement: split `/distribute` into four visible operator sections while keeping `TabDistribute` state/publish ownership intact | Verifier GO locally; eval PASS; commit/push and staging deployment next |
| `2026-05-09-release-tooling-hardening` | Release tooling hardening: Python 3.10 UTC compatibility plus bounded SSH/SFTP deploy script cleanup after successful uploads | Verifier GO locally; eval PASS; staging deployment with hardened scripts next |
| `2026-05-09-campaign-production-loop-closeout` | Campaign -> Studio -> Distribution closeout: stable handoff ids, Studio result package sync, and package-aware Result/Distribution CTAs | Pushed to main and deployed to staging/prod @ `2fedae1`; prod deployment state restored idle |
| `2026-05-09-distribution-publish-history-filters` | Distribution Center follow-up: frontend-only publish history status/platform/search filters, date grouping, and reusable history component wiring | Verifier GO locally; commit/push and staging release sync next |
| `2026-05-09-campaign-studio-production-bridge` | Campaign Output -> Advanced Studio bridge: video item handoff, prompt/template/source-asset seeding, unified Asset Library Studio slots, and prompt-only Studio quality presets | Pushed to main; staging/prod smoke passed; prod deployment state restored idle |
| `2026-05-09-distribution-center-ops-mvp` | Distribution Center operator MVP: read-only Campaign Package context, direct caption hints, account group quick selection, platform copy cards, and richer pending package readiness cards | Committed/pushed to main and included in the later staging/prod release stream |
| `2026-05-09-advanced-studio-template-optimization` | Advanced Studio Phase 1: template cleanup, Motion Transfer / Character Showcase repositioning, Quick Single inspirations, and baseline duration/aspect options | Staging verified and marked release-ready @ `37ac488`; prod metadata-only repair completed and smoke passed for deployed code `37ac488` |
| `2026-05-09-campaign-source-asset-readiness` | Campaign Output Workbench Phase 3: source asset candidates, row-level selection, and Asset Library upload routing for required game source assets | Committed/pushed to main and included in the later Campaign -> Studio release stream |
| `2026-05-08-campaign-output-one-click-production` | Campaign Output Workbench Phase 2B: one primary action saves the plan and produces supported text/post drafts before distribution handoff | Builder/Verifier complete and included in later mainline releases |
| `2026-05-07-campaign-to-distribution-handoff-mvp` | 下一步主线：把 mission-first generated brief、选中 campaign variant / CTA / routed knowledge context 送入待发布包并进入分发 | Completed; package persistence, Campaign package panel, and Distribution intake shipped |
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
