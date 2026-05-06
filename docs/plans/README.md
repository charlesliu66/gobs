# Plans Index

> 最后更新：2026-04-21
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

- [2026-05-01-campaign-creative-agent-implementation-plan.md](</Users/wei.liu/Documents/work/ai projects/gobs/docs/plans/2026-05-01-campaign-creative-agent-implementation-plan.md>)
  - 基于“游戏营销创意生产系统 / Campaign Creative Agent”目标的收口方向与分阶段落地建议
- [2026-04-21-i18n-phase0-phase1-implementation-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-i18n-phase0-phase1-implementation-plan.md>)
  - 当前 H5 中英文切换 Phase 0/1 的可执行计划
- [2026-04-21-distribute-caption-auth-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-distribute-caption-auth-design.md>)
  - 分发文案鉴权与调用边界设计
- [2026-04-21-distribute-caption-auth.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-distribute-caption-auth.md>)
  - 对应的实施计划/执行拆解
- [2026-04-21-geelark-auto-power-design.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-geelark-auto-power-design.md>)
  - GeeLark 自动开关机的设计稿
- [2026-04-21-geelark-auto-power-plan.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/2026-04-21-geelark-auto-power-plan.md>)
  - GeeLark 自动开关机的执行计划

---

## 整理建议

- 同一主题尽量保持 `design` 和 `plan` 成对，避免只有结论没有执行路径。
- 如果旧方案已经被新版替代，保留旧文档，但在旧文档顶部注明“以新版为准”。
- 当某个方案已经完整落地，可在对应 run 文档中回链到这里，方便后续检索。
