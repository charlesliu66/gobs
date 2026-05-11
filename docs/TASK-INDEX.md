# GOBS / QAS Task Index - Campaign Production Coverage V2 Mainline

## 2026-05-11 Current Mainline Addendum

- 当前正式承接主线调整为 `Campaign 素材生产覆盖率 V2`：优先提高 Campaign 需制作素材中可直接生产、模板化生产、或可辅助推进的比例，而不是继续把“创意质量评估与迭代闭环”作为第一目标。
- 第一轮必须从 Run 0 开始：`Existing Capability Audit & Compatibility Map`。它先审计现有 Campaign Output Plan、Asset Library、Google Drive、Banner Output 能力，固定“复用 / 增量 / 禁止碰”的边界，再允许 Run 1A / Run 1B / Run 2 开工。
- V2 执行权威文档是 `docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md`；原总纲 `docs/plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md` 只保留方向判断和 Team Asset 存储决策背景。
- 旧的 05-08 / 05-09 Campaign -> Studio -> Distribution、Distribution Center、Release Governance、Quality Contract、Editor Effects 等 run 仍是有效历史上下文，但不再是默认下一阶段入口。
- Source docs:
  - `docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md`
  - `docs/plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md`
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
  - `docs/plans/2026-05-10-distribution-final-mile.md`
  - `docs/plans/2026-05-11-knowledge-traceability.md`
  - `docs/plans/2026-05-11-data-contract-hardening.md`
  - `docs/plans/2026-05-11-legacy-surface-reduction.md`
  - `docs/plans/2026-05-11-large-component-refactor.md`
  - `docs/plans/2026-05-11-editor-effects-sprint.md`

> 最后更新：2026-05-11
> 用途：作为当前项目入口，快速判断“现在该看什么、主线往哪里走、哪些 run 仍然有效”。

---

## 当前状态

- 最新发布主线以 `/api/system/version` 和 `origin/main` 为准；当前阶段已经接入真实 `Gold and Glory` canonical fastpublish brain。
- 当前产品北极星：`Campaign Creative Agent` 必须从 campaign brief 出发，产出创意素材或变体，并把它们送入分发。
- 当前默认受众：市场和运营同学；专业剪辑、制片和深度调参能力保留在 `Advanced Studio`，不再定义默认体验。
- 当前最值得继续推进的方向：
  1. `Run 0 - Existing Capability Audit & Compatibility Map`：先审计现有能力、兼容枚举和复用边界，产出固定格式 audit table。
  2. `Run 1A / Run 1B`：在不替换落库 capability 的前提下做 coverage UI compatibility layer，并补齐高频文本产物策略。
  3. `Run 2 / Run 3 / Run 4`：在 Team Asset 权限与预处理缺口清楚后，再做 Banner Prompt Hardening 和后续 Distribution bridge。

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

- [2026-05-11-campaign-production-coverage-v2-adjustment-plan.md](plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md)：当前执行权威；Run 0 审计先行，后续只做增量兼容，不替换已有 Campaign Output / Asset Library / Drive / Banner 能力。
- [2026-05-11-campaign-production-coverage-and-team-assets-plan.md](plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md)：下一阶段总纲；将目标从质量闭环前移到 `Campaign 素材生产覆盖率提升`，并记录 Team Asset 存储决策。
- [2026-05-10-gobs-next-optimization-checklist.md](plans/2026-05-10-gobs-next-optimization-checklist.md)：上一阶段 Quality/Data Contract 到 Editor Effects 的落地脉络；仅作为历史上下文，不再作为默认下一轮入口。

---

## 近期重要 run

| Run | 作用 | 状态 |
|---|---|---|
| `2026-05-11-campaign-production-coverage-run0-audit` | Run 0: Existing Capability Audit & Compatibility Map for Campaign Production Coverage V2 | Next to bootstrap; must finish before Run 1A / Run 1B / Run 2 implementation |
| `2026-05-11-editor-effects-sprint` | Run 12: add a tested editor packaging template catalog and compact workbench apply menu without changing render/export engines | Builder/Verifier in progress on branch `codex/2026-05-11-editor-effects-sprint`; this window is also acting as Release Owner per user instruction |
| `2026-05-11-large-component-refactor` | Run 11: extract `/distribute` asset-option helpers into a tested module without changing publish behavior | Merged/deployed @ `44beb99`; Run 12 starts from this base |
| `2026-05-11-legacy-surface-reduction` | Run 10: hide parked legacy surfaces from primary navigation, preserve direct URLs, and guard `sj-ui` isolation | Merged/deployed @ `278235f`; Run 11 starts from this base |
| `2026-05-11-data-contract-hardening` | Run 9: Campaign/Brief/Output/Package lineage, refresh-safe Studio handoff restore, and compact link-health status | Merged/deployed @ `24c23c1`; Run 10 starts from this base |
| `2026-05-11-knowledge-traceability` | Run 8: visible knowledge citations, citation feedback save/list, rejected-citation suppression, and Output Plan knowledge references | Merged/deployed @ `9aaef71`; Run 9 starts from this base |
| `2026-05-11-distribution-final-mile` | Run 7: active context restore, recent package/config reuse, account-group preview/update, latest-batch summary, and actionable failure guidance | Merged/deployed @ `bc693a7`; Run 8 starts from this base |
| `2026-05-11-character-showcase-validation` | Run 6: 10-sample Character Showcase validation ledger, constrained continue decision, and Studio entry/preset guidance | Merged/deployed @ `02d65fc`; Run 7 starts from this base |
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
