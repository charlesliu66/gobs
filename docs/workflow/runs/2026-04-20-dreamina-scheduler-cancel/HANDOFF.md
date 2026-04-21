# 新对话启动指令

在新 Cursor 对话里，第一条消息发这段就行：

```
@docs/workflow/runs/2026-04-20-dreamina-scheduler-cancel/SESSION-ANCHOR.md
@docs/workflow/runs/2026-04-20-dreamina-scheduler-cancel/planner-spec.md

按 CLAUDE.md 的 4+1 工作流推进 v0.65。
当前 Gate 1（Planner）已完成，直接进 Gate 2（Builder）。
按 planner-spec.md 的"交付清单（Builder checklist）"顺序实施，每完成一项打勾。
实施完整套后做完整的三端一统部署（五步），最后在本目录产出 builder-report.md。
```

---

## 关键确认点（本轮我按你的"按建议来"已定稿）

| 问题 | 定稿 |
|---|---|
| 取消是物理删还是标 cancelled 保留？ | **标 cancelled 保留**（审计 & 历史可查；jobs.json 体量有限可接受） |
| awaiting_submit 单 user/project 上限？ | **20 个**（覆盖 99% 真实使用；超限返回 429 文案友好） |
| "已取消"徽标是否在 shot-strip 常驻显示？ | **常驻显示**（灰色，tooltip 带取消原因）；用户重新点生成后新 job 状态覆盖之 |

若实施过程中 Builder 有不同判断，在 `builder-report.md` 的"偏离 Planner"章节明确写出，不要静默变更。

---

## 本轮 transcript 路径（便于查细节）

`C:\Users\wei.liu\.cursor\projects\c-Users-wei-liu-Desktop-cursor-try-QAS/agent-transcripts/f53cad3a-7317-4816-9577-b3dfd86e93e9/f53cad3a-7317-4816-9577-b3dfd86e93e9.jsonl`

搜关键词：`1310` / `dreaminaQueueRef` / `cancelJob` / `awaiting_submit` / `queue-snapshot` 能快速定位讨论原文。
