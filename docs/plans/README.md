# Plans Index

> 最后更新：2026-05-09
> 用途：说明 `docs/plans/` 存什么、什么时候该放到这里，而不是放进 `workflow/runs/`。

---

## 目录职责

- `docs/plans/` 适合保存跨多个 run 仍会持续复用的设计稿、阶段性方案和实施计划。
- `docs/workflow/runs/<run-id>/` 适合保存某一次具体任务的 planner、builder、verifier、handoff 和 release 结论。
- 如果一份文档主要回答“这个方向应该怎么做”，放 `plans/`。
- 如果一份文档主要回答“这次任务具体做了什么、怎么验的”，放 `workflow/runs/`。

---

## 推荐命名

- 设计稿：`YYYY-MM-DD-<topic>-design.md`
- 实施计划：`YYYY-MM-DD-<topic>-plan.md`
- 分阶段实施：`YYYY-MM-DD-<topic>-implementation-plan.md`

---

## 当前值得优先关注的方案

- [2026-05-09-next-optimization-execution-checklist.md](./2026-05-09-next-optimization-execution-checklist.md)
  - 二轮优化后总执行清单：把 OpenClaw 最新评估、当前代码事实和最近发布实操结果收敛成 `发布稳定性 -> 减负清理 -> Distribution 最后一公里 -> 数据契约 -> 巨型组件治理` 的分阶段 checklist。
- [2026-05-09-gobs-current-state-optimization-recommendation.md](./2026-05-09-gobs-current-state-optimization-recommendation.md)
  - 基于 OpenClaw 项目现状评估和最新 Campaign/Studio/Distribution 优化结果，明确下一阶段采用 `方案 C + 方案 A`：先跑顺运营体验闭环，再做低风险减法，暂缓大规模状态管理/组件重构。
- [2026-05-09-distribution-center-optimization.md](./2026-05-09-distribution-center-optimization.md)
  - Distribution Center 专项优化方案；部分内容已由 operator MVP 和 publish history follow-up 落地，后续以当前状态优化建议为上层优先级。
- [2026-05-07-campaign-to-distribution-handoff-mvp-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md>)
  - 基于 OpenClaw 代码/产品评估、当前北极星和 `a94a7f5` mission-first 基线，定义 `Mission -> Generated Brief Review -> Variant Pack -> Distribution Package -> 分发` 的下一步主线、产品形态、技术边界和分期路线。
- [2026-05-06-campaign-creative-agent-next-phase-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md>)
  - 将产品默认形态从工具集合收敛为面向市场/运营的 `Campaign Mission Control`
- [2026-05-06-campaign-mission-control-phase0-implementation-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md>)
  - 基于 knowledge-aware creative 前提的 Mission Control Phase 0 实施计划
- [2026-05-06-gobs-fastpublish-knowledge-integration-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md>)
  - GOBS 如何吸收 fastpublish 的 knowledge 分层，把 `Knowledge Brain -> Campaign Creative -> Editor` 串成可落地方案
- [2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md>)
  - 对应的前后端实施拆解，覆盖 knowledge pack 存储、导入、strategy 消费和 editor 注入
- [2026-05-01-campaign-creative-agent-implementation-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-01-campaign-creative-agent-implementation-plan.md>)
  - 基于“游戏营销创意生产系统 / Campaign Creative Agent”目标的收口方向与分阶段落地建议
- [2026-04-21-i18n-phase0-phase1-implementation-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-i18n-phase0-phase1-implementation-plan.md>)
  - 当前 H5 中英文切换 Phase 0/1 的可执行计划
- [2026-04-21-distribute-caption-auth-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-distribute-caption-auth-design.md>)
  - 分发文案鉴权与调用边界设计
- [2026-04-21-distribute-caption-auth.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-distribute-caption-auth.md>)
  - 对应的实施计划/执行拆解
- [2026-04-21-geelark-auto-power-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-geelark-auto-power-design.md>)
  - GeeLark 自动开关机的设计稿
- [2026-05-08-campaign-output-workbench-game-source-assets-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md>)
  - Defines the next Campaign Mission Control direction: after brief confirmation, users should see the campaign output plan, required game source assets, GOBS production capability, and capability gaps instead of internal System Plan reasoning.
- [2026-05-08-campaign-output-workbench-game-source-assets-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md>)
  - Implementation plan for the B-stage Output Workbench with C-ready data shapes, covering output plan types, backend persistence, frontend workbench UI, distribution package bridging, tests, run docs, and release sync. Phase 1 execution evidence lives in `docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/`.
- [2026-05-08-campaign-output-production-adapters-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-08-campaign-output-production-adapters-design.md>)
  - Phase 2A design for safe Campaign Output production adapters: produce supported text/post drafts, keep blocked visual/video items honest, and bridge produced items into pending distribution packages without touching low-level generation services.
- [2026-05-08-campaign-output-production-adapters-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-05-08-campaign-output-production-adapters-plan.md>)
  - TDD implementation plan for the Phase 2A production adapter run at `docs/workflow/runs/2026-05-08-campaign-output-production-adapters/`.
- [2026-04-21-geelark-auto-power-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-geelark-auto-power-plan.md>)
  - GeeLark 自动开关机的执行计划

---

## 整理建议

- 同一主题尽量保持 `design` 和 `plan` 成对，避免只有结论没有执行路径。
- 如果旧方案已经被新版替代，保留旧文档，但在旧文档顶部注明“以新版为准”。
- 当某个方案已经完整落地，可在对应 run 文档中回链到这里，方便后续检索。
