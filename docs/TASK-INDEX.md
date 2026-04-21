# GOBS / QAS Task Index

> 最后更新：2026-04-21
> 用途：作为当前项目的总入口，帮助快速找到“现在该看什么、当前 run 是什么、哪些文档最重要”。

---

## 当前状态

- 线上 H5 当前已部署到 `main@a1c7e4b`
- 最近一次已完成的稳定性优化 run：
  - [2026-04-21-h5-stability-polish](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs/2026-04-21-h5-stability-polish/SESSION-ANCHOR.md>)
- 当前最值得继续推进的方向：
  1. `ProductionWizard` 多状态源收口
  2. 后端 `route -> service -> repository` 分层收口
  3. 前端 API / 鉴权基础设施统一

---

## 必读文档

### 1. 项目运行规则
- [AGENTS.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/AGENTS.md>)
  - 项目级总规则，面向 Codex / Cursor / OpenClaw
- [CLAUDE.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/CLAUDE.md>)
  - Claude / Cursor 侧运行约定，和 `AGENTS.md` 大体一致
- [docs/CODEX-CLI-PROJECT-GUIDE.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/CODEX-CLI-PROJECT-GUIDE.md>)
  - `AGENTS.md` 的长文完整版，适合复杂任务和新同学快速补全上下文
- [.claude/memory/feedback.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/.claude/memory/feedback.md>)
  - 历史事故、行为规则、踩坑教训

### 2. 产品与现状
- [PRODUCT.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/PRODUCT.md>)
  - 功能总览与 changelog 权威来源
- [2026-04-21-qas-current-state-assessment.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/reviews/2026-04-21-qas-current-state-assessment.md>)
  - 对当前仓库状态和线上 H5 的评估总结

### 3. workflow runs
- [2026-04-21-h5-stability-polish](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs/2026-04-21-h5-stability-polish/SESSION-ANCHOR.md>)
  - 最近一次已落地的稳定性优化 run
- [2026-04-20-dreamina-scheduler-cancel](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs/2026-04-20-dreamina-scheduler-cancel/SESSION-ANCHOR.md>)
  - 即梦调度器 / 取消排队的重要历史 run，带 handoff 说明

---

## 文档分工建议

为了避免同一套内容在多个文档里越写越散，建议这样理解：

- `AGENTS.md`
  - 只放“必须遵守的项目级规则”和最小入口
- `CLAUDE.md`
  - 与 `AGENTS.md` 保持近似，但主要服务 Claude / Cursor 生态
- `docs/CODEX-CLI-PROJECT-GUIDE.md`
  - 放完整长文说明，不追求短
- `docs/TASK-INDEX.md`
  - 放“当前入口”和“现在最重要的文档地图”
- `docs/reviews/*.md`
  - 放阶段性评估，不承担规则职责
- `docs/workflow/runs/*`
  - 放单次任务的规格、实施、验证、发布结论

---

## 近期重要 run

| Run | 作用 | 状态 |
|---|---|---|
| `2026-04-21-h5-stability-polish` | 修复批量任务鉴权、SSE 重连、编辑器回跳、真实版本展示 | 已完成 |
| `2026-04-20-dreamina-scheduler-cancel` | 即梦全平台 FIFO 调度与取消排队方案 | 重要历史 run / 需继续整理 |

---

## 旧任务归档

更早的 TASK-01 ~ TASK-06 和 4 月中旬的优化事项，已经进入历史归档阶段，不再适合作为当前任务入口。若需要回溯，可查看：

- `docs/workflow/runs/`
- `PRODUCT.md`
- `docs/reviews/`
