# GOBS / QAS Docs Index

> 最后更新：2026-04-21
> 用途：解释当前文档体系各自负责什么，减少重复维护。

---

## A. 规则层

| 文档 | 角色 | 建议维护方式 |
|---|---|---|
| [AGENTS.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/AGENTS.md>) | 项目级智能体规则总入口 | 保持短、硬、稳定 |
| [CLAUDE.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/CLAUDE.md>) | Claude / Cursor 兼容入口 | 与 `AGENTS.md` 同步核心规则 |
| [docs/CODEX-CLI-PROJECT-GUIDE.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/CODEX-CLI-PROJECT-GUIDE.md>) | 长文完整版说明 | 允许详细展开，不必追求简短 |
| [.claude/memory/feedback.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/.claude/memory/feedback.md>) | 历史事故与教训 | 只记录规则、不要混任务细节 |

---

## B. 产品层

| 文档 | 角色 | 说明 |
|---|---|---|
| [PRODUCT.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/PRODUCT.md>) | 功能总览 + changelog 权威源 | 所有用户可见改动都应更新 |
| [docs/reviews/2026-04-21-qas-current-state-assessment.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/reviews/2026-04-21-qas-current-state-assessment.md>) | 当前状态评估 | 适合阶段性盘点，不适合承载长期规则 |

---

## C. 任务层

| 文档/目录 | 角色 | 说明 |
|---|---|---|
| [docs/TASK-INDEX.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/TASK-INDEX.md>) | 当前任务总入口 | 先看它，再决定读哪个 run |
| [docs/workflow/runs/](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs>) | 单次任务全流程档案 | 每个 run 独立保存规划、实施、验证、发布结果 |

---

## D. 方案层

| 文档/目录 | 角色 | 说明 |
|---|---|---|
| [docs/plans/](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans>) | 跨 run 的设计与实施方案池 | 适合沉淀主题型设计、阶段性 implementation plan |
| [docs/plans/README.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/plans/README.md>) | `plans/` 目录导航 | 说明 design / plan 的分工与命名约定 |
| [docs/i18n-中英文切换设计方案-v2.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/i18n-中英文切换设计方案-v2.md>) | 当前 i18n 主设计稿 | 面向后续落地，优先于旧版设计稿阅读 |

---

## E. 当前最重要的 5 份文档

1. [AGENTS.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/AGENTS.md>)
2. [.claude/memory/feedback.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/.claude/memory/feedback.md>)
3. [docs/TASK-INDEX.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/TASK-INDEX.md>)
4. [PRODUCT.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/PRODUCT.md>)
5. [docs/reviews/2026-04-21-qas-current-state-assessment.md](</C:/Users/wei.liu/Desktop/cursor_try/QAS/docs/reviews/2026-04-21-qas-current-state-assessment.md>)

---

## F. 后续整合建议

- `AGENTS.md` 和 `CLAUDE.md` 可以继续保留双份，但最好只保留“短版规则”，减少细节复制
- `docs/CODEX-CLI-PROJECT-GUIDE.md` 作为长版说明，承接所有扩展细节
- `docs/TASK-INDEX.md` 只承担“当前入口”，不要再写成一次性的历史任务归档
- `docs/plans/` 用来沉淀跨 run 的主题设计，不要把它和 `workflow/runs/` 的单次交付档案混在一起
- 历史 handoff、review、run 文档继续保留，但都通过 `TASK-INDEX` 或 `DOCS-INDEX` 被发现
